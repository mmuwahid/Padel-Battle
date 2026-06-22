// Avatar subsystem extracted from AppContent (Issue #2 god-component refactor).
// Owns avatar URL state, the load-on-mount effect, file-pick → crop-modal flow,
// upload (with iOS retry), remove, and write-through to the claimed player row.
// Callers pass cross-cutting deps and receive the same values/functions that
// AppContent previously exposed inline.
import { useState, useEffect } from "react";

export function useAvatar({ supabase, user, claimedPlayer, loadLeagueData, showToast }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // FT-03: Load avatar URL from profiles table
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    })();
  }, [user.id]);

  // S069: avatar pick now opens AvatarCropModal first; the modal returns a
  // pre-cropped 200x200 JPEG blob to uploadCroppedAvatar(). The legacy
  // auto-center-crop path is retained as fallback if the cropper fails.
  const [avatarFile, setAvatarFile] = useState(null);
  const uploadAvatar = (file) => {
    if (!file) return;
    setAvatarFile(file);
  };

  // FT-03 / Issue #20: Upload avatar (200x200 already, upload to storage, save URL).
  // S069: input is now a pre-cropped blob from AvatarCropModal. Path/storage logic
  // unchanged; we just skip the canvas resize step.
  const uploadCroppedAvatar = async (blob) => {
    if (!blob) return;
    setAvatarFile(null);
    setAvatarUploading(true);
    try {
      const path = `${user.id}/avatar.jpg`;
      // S067: 1-retry upload pattern (iOS PWA storage cold-start race)
      let upErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (!error) { upErr = null; break; }
        upErr = error;
        if (attempt === 0) await new Promise(r => setTimeout(r, 250));
      }
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = publicUrl + "?t=" + Date.now();
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      // S051 Issue #20: write-through to the user's claimed player row so the photo
      // appears everywhere players.avatar_url is rendered (ranking, partners, H2H,
      // Players grid, drill-in profile). Skip if the user hasn't claimed a player yet.
      if (claimedPlayer?.id) {
        await supabase.from("players").update({ avatar_url: url }).eq("id", claimedPlayer.id);
        await loadLeagueData();
      }
      setAvatarUrl(url);
      showToast("Photo updated!");
    } catch (_err) {
      showToast("Failed to upload photo", "error");
    }
    setAvatarUploading(false);
  };

  const removeAvatar = async () => {
    try {
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      // S051 Issue #20: also clear the claimed player's avatar so all surfaces revert.
      if (claimedPlayer?.id) {
        await supabase.from("players").update({ avatar_url: null }).eq("id", claimedPlayer.id);
        await loadLeagueData();
      }
      setAvatarUrl(null);
      showToast("Photo removed");
    } catch (_err) { showToast("Failed to remove photo", "error"); }
  };

  return {
    avatarUrl, avatarUploading,
    avatarFile, cancelCrop: () => setAvatarFile(null),
    uploadAvatar, uploadCroppedAvatar, removeAvatar,
  };
}
