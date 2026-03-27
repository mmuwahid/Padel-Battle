import React from "react";

export class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return{hasError:true,error};}
  render(){
    if(this.state.hasError)return(
      <div style={{padding:20,textAlign:"center",color:"#e4e4ef",fontFamily:"'Outfit',sans-serif"}}>
        <div style={{fontSize:24,marginBottom:8}}>⚠️</div>
        <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Something went wrong</div>
        <div style={{fontSize:11,color:"#7a7a8e",marginBottom:16}}>{this.state.error?.message||"Unknown error"}</div>
        <button onClick={()=>this.setState({hasError:false,error:null})} style={{padding:"8px 16px",background:"#4ADE80",border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer"}}>Try Again</button>
      </div>
    );
    return this.props.children;
  }
}
