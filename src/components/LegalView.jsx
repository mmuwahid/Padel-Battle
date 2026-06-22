import Icon from './Icon';

/* Inline legal pages rendered as sidebar views (same back-btn + safe-area
   treatment as RulesView, SettingsView, etc.). Content is hardcoded here
   rather than loading the static HTML to keep the in-app experience native. */

const ACCENT = "#4ADE80";
const MUTED = "#9090a4";
const WHITE = "#fff";
const SURFACE = "#12121a";

const S = {
  wrap: { padding: "0 18px 40px" },
  h2: { fontSize: 20, fontWeight: 700, margin: "28px 0 10px", color: ACCENT },
  h3: { fontSize: 15, fontWeight: 600, margin: "18px 0 6px", color: WHITE },
  p: { fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 10 },
  ul: { paddingLeft: 18, marginBottom: 14 },
  li: { fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 5 },
  table: { width: "100%", borderCollapse: "collapse", margin: "12px 0" },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 12, borderBottom: `1px solid #2a2a3a`, color: WHITE, fontWeight: 600, background: SURFACE },
  td: { textAlign: "left", padding: "8px 10px", fontSize: 12, borderBottom: `1px solid #2a2a3a`, color: MUTED },
  box: { background: SURFACE, borderRadius: 12, padding: 16, marginTop: 20 },
  boxP: { fontSize: 13, color: MUTED, marginBottom: 4 },
  a: { color: ACCENT, textDecoration: "none" },
  eff: { fontSize: 12, color: MUTED, marginBottom: 24 },
};

export function PrivacyView({ goBack }) {
  return (
    <div className="rtb">
      <div className="back-btn-row">
        <button className="back-btn" aria-label="Back" onClick={goBack}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>
      <div className="rtbey">Legal</div>
      <div className="rtbh1">Privacy Policy</div>
      <div style={S.wrap}>
        <p style={S.eff}>Effective: June 22, 2026 &middot; Last updated: June 22, 2026</p>

        <p style={S.p}>PadelHub (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a padel league management and match tracking application. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the PadelHub mobile application and website (collectively, the &ldquo;Service&rdquo;).</p>
        <p style={S.p}>By using PadelHub, you agree to the collection and use of information as described in this policy.</p>

        <h2 style={S.h2}>1. Information We Collect</h2>

        <h3 style={S.h3}>1.1 Account Information</h3>
        <p style={S.p}>When you create an account, we collect:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{color:WHITE}}>Email address</strong> — used for authentication, account recovery, and essential service communications</li>
          <li style={S.li}><strong style={{color:WHITE}}>Display name</strong> — shown to other players in your leagues</li>
          <li style={S.li}><strong style={{color:WHITE}}>Profile photo</strong> (optional) — uploaded by you for your player profile</li>
          <li style={S.li}><strong style={{color:WHITE}}>Authentication provider data</strong> — if you sign in with Google or Apple, we receive your name and email from that provider</li>
        </ul>

        <h3 style={S.h3}>1.2 Player Profile Data</h3>
        <p style={S.p}>You may optionally provide:</p>
        <ul style={S.ul}>
          <li style={S.li}>Country / nationality</li>
          <li style={S.li}>Playing position (left/right)</li>
          <li style={S.li}>Handedness (left/right)</li>
          <li style={S.li}>Gender</li>
          <li style={S.li}>Date of birth</li>
          <li style={S.li}>Player grade / self-assessment</li>
        </ul>

        <h3 style={S.h3}>1.3 Match and League Data</h3>
        <p style={S.p}>When you participate in leagues, we collect:</p>
        <ul style={S.ul}>
          <li style={S.li}>Match scores and results</li>
          <li style={S.li}>Season and league membership data</li>
          <li style={S.li}>Player statistics and rankings (calculated from match data)</li>
          <li style={S.li}>Tournament and game mode participation</li>
          <li style={S.li}>Open match votes and preferences</li>
        </ul>

        <h3 style={S.h3}>1.4 Subscription and Payment Data</h3>
        <p style={S.p}>If you subscribe to PadelHub Pro:</p>
        <ul style={S.ul}>
          <li style={S.li}>We receive subscription status, plan type, and billing period from Apple App Store or Google Play Store via RevenueCat (our subscription management provider)</li>
          <li style={S.li}><strong style={{color:WHITE}}>We do NOT collect or store your payment card details, bank information, or billing address.</strong> All payment processing is handled directly by Apple or Google.</li>
        </ul>

        <h3 style={S.h3}>1.5 Technical Data</h3>
        <p style={S.p}>We automatically collect:</p>
        <ul style={S.ul}>
          <li style={S.li}>Device type and operating system</li>
          <li style={S.li}>App version</li>
          <li style={S.li}>Crash reports and error logs (for debugging purposes)</li>
        </ul>

        <h3 style={S.h3}>1.6 What We Do NOT Collect</h3>
        <ul style={S.ul}>
          <li style={S.li}>We do not collect precise geolocation data</li>
          <li style={S.li}>We do not access your contacts, camera roll, or microphone (camera access is only used when you choose to upload a profile photo)</li>
          <li style={S.li}>We do not use tracking technologies for advertising purposes</li>
          <li style={S.li}>We do not sell your personal data to third parties</li>
        </ul>

        <h2 style={S.h2}>2. How We Use Your Information</h2>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Purpose</th><th style={S.th}>Data Used</th><th style={S.th}>Legal Basis</th></tr></thead>
          <tbody>
            <tr><td style={S.td}>Provide and operate the Service</td><td style={S.td}>Account info, match data, league data</td><td style={S.td}>Contract</td></tr>
            <tr><td style={S.td}>Display player profiles and rankings</td><td style={S.td}>Display name, avatar, stats, country</td><td style={S.td}>Contract</td></tr>
            <tr><td style={S.td}>Manage your subscription</td><td style={S.td}>Subscription status, plan type</td><td style={S.td}>Contract</td></tr>
            <tr><td style={S.td}>Send essential notifications</td><td style={S.td}>Email address, push token</td><td style={S.td}>Contract</td></tr>
            <tr><td style={S.td}>Improve the Service and fix bugs</td><td style={S.td}>Technical data, crash reports</td><td style={S.td}>Legitimate interest</td></tr>
            <tr><td style={S.td}>Respond to support requests</td><td style={S.td}>Email address, account data</td><td style={S.td}>Legitimate interest</td></tr>
            <tr><td style={S.td}>Prevent fraud and abuse</td><td style={S.td}>Account data, usage patterns</td><td style={S.td}>Legitimate interest</td></tr>
          </tbody>
        </table>

        <h2 style={S.h2}>3. How We Share Your Information</h2>
        <h3 style={S.h3}>3.1 With Other Players</h3>
        <p style={S.p}>Your display name, avatar, country, playing position, grade, and match statistics are visible to other members of leagues you belong to. This is core to how PadelHub works.</p>

        <h3 style={S.h3}>3.2 Service Providers</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Provider</th><th style={S.th}>Purpose</th><th style={S.th}>Data Shared</th></tr></thead>
          <tbody>
            <tr><td style={S.td}>Supabase (US)</td><td style={S.td}>Database, auth, storage</td><td style={S.td}>All account &amp; app data</td></tr>
            <tr><td style={S.td}>Vercel (US)</td><td style={S.td}>Web hosting</td><td style={S.td}>Technical request data</td></tr>
            <tr><td style={S.td}>RevenueCat (US)</td><td style={S.td}>Subscription mgmt</td><td style={S.td}>User ID, sub status</td></tr>
            <tr><td style={S.td}>Apple / Google</td><td style={S.td}>Auth, payments</td><td style={S.td}>Auth tokens, receipts</td></tr>
          </tbody>
        </table>

        <h3 style={S.h3}>3.3 We Do NOT</h3>
        <ul style={S.ul}>
          <li style={S.li}>Sell your personal data to advertisers or data brokers</li>
          <li style={S.li}>Share your data with marketing partners</li>
          <li style={S.li}>Use your data for targeted advertising</li>
          <li style={S.li}>Share your email address with other users</li>
        </ul>

        <h3 style={S.h3}>3.4 Legal Requirements</h3>
        <p style={S.p}>We may disclose your information if required by law, legal process, or government request, or to protect the rights, safety, or property of PadelHub, our users, or the public.</p>

        <h2 style={S.h2}>4. Data Retention</h2>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{color:WHITE}}>Active accounts:</strong> We retain your data for as long as your account is active.</li>
          <li style={S.li}><strong style={{color:WHITE}}>Deleted accounts:</strong> Personal data removed within 30 days. Anonymised match statistics may be retained for league integrity.</li>
          <li style={S.li}><strong style={{color:WHITE}}>Subscription data:</strong> Billing records retained for up to 3 years for financial record-keeping.</li>
          <li style={S.li}><strong style={{color:WHITE}}>Technical logs:</strong> Crash reports automatically deleted after 90 days.</li>
        </ul>

        <h2 style={S.h2}>5. Your Rights</h2>
        <p style={S.p}>Depending on your location, you may have the following rights:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{color:WHITE}}>Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li style={S.li}><strong style={{color:WHITE}}>Correction:</strong> Update or correct inaccurate data (you can do this directly in the app).</li>
          <li style={S.li}><strong style={{color:WHITE}}>Deletion:</strong> Request deletion of your account and associated data from Settings, or contact us.</li>
          <li style={S.li}><strong style={{color:WHITE}}>Data portability:</strong> Request your data in a machine-readable format.</li>
          <li style={S.li}><strong style={{color:WHITE}}>Withdraw consent:</strong> Where processing is based on consent, you can withdraw it at any time.</li>
          <li style={S.li}><strong style={{color:WHITE}}>Object:</strong> Object to processing based on legitimate interest.</li>
        </ul>
        <p style={S.p}>To exercise any of these rights, contact us at the address below. We will respond within 30 days.</p>

        <h2 style={S.h2}>6. Data Security</h2>
        <ul style={S.ul}>
          <li style={S.li}>All data transmitted over HTTPS (TLS encryption in transit)</li>
          <li style={S.li}>Row-level security (RLS) — users can only access authorised data</li>
          <li style={S.li}>Passwords hashed using industry-standard algorithms</li>
          <li style={S.li}>We do not store payment credentials</li>
          <li style={S.li}>Access to production systems restricted to authorised personnel</li>
        </ul>
        <p style={S.p}>No system is 100% secure. If we become aware of a data breach, we will notify you in accordance with applicable law.</p>

        <h2 style={S.h2}>7. Children&rsquo;s Privacy</h2>
        <p style={S.p}>PadelHub is not intended for children under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will promptly delete it.</p>

        <h2 style={S.h2}>8. International Data Transfers</h2>
        <p style={S.p}>PadelHub is operated from the United Arab Emirates. Our service providers are based in the United States. By using PadelHub, you consent to the transfer of your data to these jurisdictions.</p>

        <h2 style={S.h2}>9. Third-Party Links</h2>
        <p style={S.p}>PadelHub may contain links to external websites. We are not responsible for the privacy practices of those third parties.</p>

        <h2 style={S.h2}>10. Changes to This Policy</h2>
        <p style={S.p}>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the app. Continued use of PadelHub after changes constitutes acceptance.</p>

        <h2 style={S.h2}>11. Contact Us</h2>
        <div style={S.box}>
          <p style={S.boxP}><strong style={{color:WHITE}}>PadelHub</strong></p>
          <p style={S.boxP}>Email: <a style={S.a} href="mailto:support@padelhub.app">support@padelhub.app</a></p>
          <p style={S.boxP}>Privacy: <a style={S.a} href="mailto:privacy@padelhub.app">privacy@padelhub.app</a></p>
        </div>
      </div>
    </div>
  );
}

export function TermsView({ goBack }) {
  return (
    <div className="rtb">
      <div className="back-btn-row">
        <button className="back-btn" aria-label="Back" onClick={goBack}>
          <Icon name="chevron-left" size={18} color="currentColor" />
        </button>
      </div>
      <div className="rtbey">Legal</div>
      <div className="rtbh1">Terms of Service</div>
      <div style={S.wrap}>
        <p style={S.eff}>Effective: June 22, 2026 &middot; Last updated: June 22, 2026</p>

        <p style={S.p}>These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the PadelHub application and website (the &ldquo;Service&rdquo;), operated by PadelHub. By creating an account or using the Service, you agree to be bound by these Terms.</p>

        <h2 style={S.h2}>1. The Service</h2>
        <p style={S.p}>PadelHub is a padel league management and match tracking platform that allows users to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Create and join padel leagues</li>
          <li style={S.li}>Log match scores and track player statistics</li>
          <li style={S.li}>View rankings, leaderboards, and player profiles</li>
          <li style={S.li}>Manage seasons, tournaments, and game modes</li>
          <li style={S.li}>Organise open matches with other players</li>
        </ul>

        <h2 style={S.h2}>2. Accounts</h2>
        <h3 style={S.h3}>2.1 Registration</h3>
        <p style={S.p}>You must create an account to use PadelHub. You can register using your email address, or sign in with Google or Apple. You must be at least 13 years old.</p>

        <h3 style={S.h3}>2.2 Account Security</h3>
        <p style={S.p}>You are responsible for maintaining the security of your account credentials. Notify us immediately if you suspect unauthorised access.</p>

        <h3 style={S.h3}>2.3 Account Accuracy</h3>
        <p style={S.p}>You agree to provide accurate information and keep it up to date. We reserve the right to suspend accounts with false or misleading information.</p>

        <h2 style={S.h2}>3. Subscriptions and Payments</h2>
        <h3 style={S.h3}>3.1 Free and Pro Tiers</h3>
        <p style={S.p}>PadelHub offers a free tier with limited features and a paid subscription (&ldquo;PadelHub Pro&rdquo;) with full access.</p>

        <div style={{...S.box, borderLeft:`3px solid ${ACCENT}`, borderRadius:"0 8px 8px 0", marginBottom:16}}>
          <p style={{...S.boxP,color:WHITE,fontWeight:600}}>PadelHub Pro pricing:</p>
          <p style={S.boxP}>Monthly: $4.99 USD &middot; Annual: $34.99 USD</p>
          <p style={{...S.boxP,fontSize:11}}>Prices may vary by region.</p>
        </div>

        <h3 style={S.h3}>3.2 Free Trial</h3>
        <p style={S.p}>New subscribers may be eligible for a 7-day free trial. If you do not cancel before the trial ends, your subscription will automatically convert to a paid subscription.</p>

        <h3 style={S.h3}>3.3 Auto-Renewal</h3>
        <p style={S.p}>Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period.</p>

        <h3 style={S.h3}>3.4 How to Cancel</h3>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{color:WHITE}}>iOS:</strong> Settings &gt; [Your Name] &gt; Subscriptions &gt; PadelHub</li>
          <li style={S.li}><strong style={{color:WHITE}}>Android:</strong> Google Play Store &gt; Subscriptions &gt; PadelHub</li>
        </ul>
        <p style={S.p}>Cancellation takes effect at the end of the current billing period. Deleting the app does not cancel your subscription.</p>

        <h3 style={S.h3}>3.5 Refunds</h3>
        <p style={S.p}>Refund requests must be directed to the respective store (Apple: reportaproblem.apple.com, Google: Google Play refund policy). We do not process payments directly.</p>

        <h3 style={S.h3}>3.6 Price Changes</h3>
        <p style={S.p}>We may change subscription prices. Price changes will not affect your current billing period. We will notify you before any increase applies.</p>

        <h2 style={S.h2}>4. User Conduct</h2>
        <p style={S.p}>You agree not to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Use the Service for any unlawful purpose</li>
          <li style={S.li}>Harass, abuse, or threaten other users</li>
          <li style={S.li}>Submit false match scores or manipulate rankings</li>
          <li style={S.li}>Create fake accounts or impersonate other players</li>
          <li style={S.li}>Attempt unauthorised access to other accounts or our systems</li>
          <li style={S.li}>Use automated tools, bots, or scrapers</li>
          <li style={S.li}>Interfere with or disrupt the Service</li>
        </ul>

        <h2 style={S.h2}>5. User Content</h2>
        <h3 style={S.h3}>5.1 Your Content</h3>
        <p style={S.p}>You retain ownership of content you create. By submitting content, you grant us a non-exclusive, royalty-free licence to use and display it within the Service.</p>

        <h3 style={S.h3}>5.2 League Data</h3>
        <p style={S.p}>Match scores, rankings, and league statistics are collaborative data. If you leave a league, your historical match data remains for integrity purposes.</p>

        <h2 style={S.h2}>6. Intellectual Property</h2>
        <p style={S.p}>The PadelHub name, logo, design, and code are our intellectual property. You may not copy, modify, or distribute them without written consent.</p>

        <h2 style={S.h2}>7. Availability</h2>
        <p style={S.p}>We strive to keep PadelHub available but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance or circumstances beyond our control.</p>

        <h2 style={S.h2}>8. Limitation of Liability</h2>
        <ul style={S.ul}>
          <li style={S.li}>The Service is provided &ldquo;as is&rdquo; without warranties of any kind.</li>
          <li style={S.li}>We are not liable for indirect, incidental, special, or consequential damages.</li>
          <li style={S.li}>Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</li>
        </ul>

        <h2 style={S.h2}>9. Indemnification</h2>
        <p style={S.p}>You agree to indemnify PadelHub from any claims arising from your use of the Service or violation of these Terms.</p>

        <h2 style={S.h2}>10. Dispute Resolution</h2>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{color:WHITE}}>Governing law:</strong> Laws of the United Arab Emirates</li>
          <li style={S.li}><strong style={{color:WHITE}}>Jurisdiction:</strong> Courts of Dubai, UAE</li>
        </ul>

        <h2 style={S.h2}>11. Termination</h2>
        <p style={S.p}>You may delete your account at any time from Settings. We may suspend or terminate accounts that violate these Terms. Sections 5&ndash;10 survive termination.</p>

        <h2 style={S.h2}>12. General</h2>
        <ul style={S.ul}>
          <li style={S.li}>These Terms + our Privacy Policy constitute the entire agreement.</li>
          <li style={S.li}>If any provision is unenforceable, the rest remain in effect.</li>
          <li style={S.li}>Our failure to enforce any right does not constitute a waiver.</li>
        </ul>

        <h2 style={S.h2}>13. Changes to These Terms</h2>
        <p style={S.p}>We may update these Terms. Continued use of PadelHub after changes constitutes acceptance. If you disagree, stop using the Service and delete your account.</p>

        <h2 style={S.h2}>14. Contact Us</h2>
        <div style={S.box}>
          <p style={S.boxP}><strong style={{color:WHITE}}>PadelHub</strong></p>
          <p style={S.boxP}>Email: <a style={S.a} href="mailto:support@padelhub.app">support@padelhub.app</a></p>
          <p style={S.boxP}>Legal: <a style={S.a} href="mailto:legal@padelhub.app">legal@padelhub.app</a></p>
        </div>
      </div>
    </div>
  );
}
