import React from 'react';
import {signOutForRecovery} from '../../utils/dashboardSafety';

export function DashboardRecovery({message = 'Please refresh, or sign out and sign back in.', onRetry = () => window.location.reload()}) {
  return <section role="alert" style={{minHeight:'70vh',padding:'32px 20px',background:'#050816',color:'white',display:'grid',placeContent:'center',textAlign:'center'}}>
    <h1>Dashboard couldn't load</h1><p>{message}</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center'}}>
      <button style={{padding:'12px 20px'}} onClick={onRetry}>Refresh</button>
      <button style={{padding:'12px 20px'}} onClick={signOutForRecovery}>Sign out and sign back in</button>
    </div>
  </section>;
}
export default class DashboardErrorBoundary extends React.Component {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch() { console.error('[Dashboard] Rendering failed; recovery screen displayed.'); }
  render() { return this.state.failed ? <DashboardRecovery/> : this.props.children; }
}
