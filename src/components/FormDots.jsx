import React from "react";
import { A, DG } from "../theme";

export function FD({f}){
  if(!f||!f.length)return null;
  return (
    <div style={{display:"flex",gap:3,alignItems:"center"}}>
      {f.map((r,i)=>(
        <div key={i} style={{width:8,height:8,borderRadius:"50%",background:r==="W"?A:DG,opacity:0.5+(i/f.length)*0.5}}/>
      ))}
    </div>
  );
}
