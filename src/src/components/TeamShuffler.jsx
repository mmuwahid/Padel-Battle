import React, { useState } from "react";
import { shuffleIntoMatches } from '../utils/shuffle';
import Icon from './Icon';

// FT-08 — Reusable RNG pool picker + results screen.
// S066 Phase 9: restyled with new design language (.tcard / .shuf-* / .savebtn / .shcancel).
// Props:
//   players    : array of {id, name, nickname}
//   onAccept   : ({matches, sitouts}) => void
//   onCancel   : () => void
//   getName    : (id) => string
//   singleMatchMode: boolean
export function TeamShuffler({players, onAccept, onCancel, getName, singleMatchMode=false}){
  const [pool,setPool]=useState([]);
  const [result,setResult]=useState(null);

  function toggle(id){
    setPool(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  }
  function doShuffle(){
    if(pool.length<4)return;
    setResult(shuffleIntoMatches(pool));
  }
  function accept(){
    if(!result)return;
    onAccept(result);
  }
  function back(){
    setResult(null);
  }

  // === Results screen ===
  if(result){
    const {matches,sitouts}=result;
    return (
      <div className="tcard shuf-card">
        <div className="tcardh">
          <div className="tcardtit" style={{display:"flex",alignItems:"center",gap:6}}>
            <Icon name="shuffle" size={11} color="var(--accent)"/> Shuffle Results
          </div>
          <div className="shuf-meta">{matches.length} match{matches.length===1?"":"es"}{sitouts.length>0?` · ${sitouts.length} sitting out`:""}</div>
        </div>

        {singleMatchMode && matches.length>1 && (
          <div className="lmerr" style={{margin:"0 14px 10px",background:"var(--gold-dim)",borderColor:"var(--gold-glow)",color:"var(--gold)"}}>
            <Icon name="info" size={12}/> Only Match 1 will be scheduled. Extras shown for reference.
          </div>
        )}

        <div className="shuf-list">
          {matches.map((m,idx)=>(
            <div key={idx} className="shuf-match">
              <div className="shuf-match-h">Match {idx+1}{singleMatchMode&&idx>0?" (unused)":""}</div>
              <div className="shuf-match-row">
                <div className="shuf-match-team">
                  <div className="shuf-match-tlbl"><div className="tcoldot tcolha"/>Team A</div>
                  <div className="shuf-match-tnames">{getName(m.team_a[0])} / {getName(m.team_a[1])}</div>
                </div>
                <div className="shuf-match-vs">VS</div>
                <div className="shuf-match-team r">
                  <div className="shuf-match-tlbl r">Team B<div className="tcoldot tcolhb"/></div>
                  <div className="shuf-match-tnames">{getName(m.team_b[0])} / {getName(m.team_b[1])}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sitouts.length>0 && (
          <div className="shuf-sitouts">
            <div className="shuf-sitouts-lbl">Sitting Out</div>
            <div className="shuf-sitouts-list">
              {sitouts.map(id=>(
                <span key={id} className="shuf-chip">{getName(id)}</span>
              ))}
            </div>
          </div>
        )}

        <div className="shuf-actions">
          <button onClick={accept} className="savebtn on" style={{flex:2,padding:"12px 0",fontSize:13}}>
            <Icon name="check" size={14} color="#000" strokeWidth={2.5}/>Accept &amp; Use
          </button>
          <button onClick={back} className="shcancel" style={{flex:1,padding:"12px 0",fontSize:13}}>Back</button>
          <button onClick={onCancel} className="shcancel" style={{flex:1,padding:"12px 0",fontSize:13,color:"#9090a4"}}>Cancel</button>
        </div>
      </div>
    );
  }

  // === Pool picker screen ===
  const canShuffle = pool.length>=4;
  return (
    <div className="tcard shuf-card">
      <div className="tcardh">
        <div className="tcardtit" style={{display:"flex",alignItems:"center",gap:6}}>
          <Icon name="shuffle" size={11} color="var(--accent)"/> Shuffle Teams
        </div>
        <div className="shuf-meta">Pick 4+ players</div>
      </div>

      <div className="shuf-pool">
        {players.map(p=>{
          const on=pool.includes(p.id);
          return (
            <button key={p.id} onClick={()=>toggle(p.id)} className={`shuf-chip${on?' on':''}`}>
              {on && <Icon name="check" size={11} color="var(--accent)" strokeWidth={2.5}/>}
              {p.nickname||p.name}
            </button>
          );
        })}
      </div>

      <div className="shuf-info">
        <span className={canShuffle?'on':''}>{pool.length} selected{pool.length<4?" — need 4+":""}</span>
        {canShuffle && (
          <span className="shuf-info-r">{Math.floor(pool.length/4)} match{Math.floor(pool.length/4)===1?"":"es"}{pool.length%4>0?` · ${pool.length%4} sitout${pool.length%4===1?"":"s"}`:""}</span>
        )}
      </div>

      <div className="shuf-actions">
        <button onClick={doShuffle} disabled={!canShuffle} className={`savebtn${canShuffle?' on':' off'}`} style={{flex:2,padding:"12px 0",fontSize:13}}>
          {canShuffle && <Icon name="shuffle" size={14} color="#000"/>}Shuffle
        </button>
        <button onClick={onCancel} className="shcancel" style={{flex:1,padding:"12px 0",fontSize:13}}>Cancel</button>
      </div>
    </div>
  );
}
