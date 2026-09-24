import React from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react-dom/test-utils';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {AuthProvider,useAuth} from '../context/AuthContext';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import DashboardErrorBoundary from '../components/Dashboard/DashboardErrorBoundary';
let root,node;
const response=(body,status=200)=>({ok:status<400,status,statusText:'',headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(body)});
function Member(){const {user}=useAuth();return <h1>Member dashboard {user?.tier}</h1>}
beforeEach(()=>{jest.useFakeTimers();global.IS_REACT_ACT_ENVIRONMENT=true;localStorage.clear();localStorage.setItem('imali_token','test-only-token');node=document.createElement('div');document.body.appendChild(node);root=createRoot(node);jest.spyOn(console,'error').mockImplementation(()=>{});jest.spyOn(console,'warn').mockImplementation(()=>{});global.fetch=jest.fn(async path=>response(path.endsWith('/api/me')?{user:{id:'user',tier:'starter',subscription_status:'inactive'}}:{data:{status:{}}}));});
afterEach(()=>{act(()=>root.unmount());node.remove();jest.restoreAllMocks();jest.useRealTimers();delete global.fetch;});
async function mount(){await act(async()=>{root.render(<MemoryRouter initialEntries={['/dashboard']}><DashboardErrorBoundary><AuthProvider><Routes><Route path="/dashboard" element={<ProtectedRoute requirePaid={false}><Member/></ProtectedRoute>}/><Route path="/login" element={<h1>Sign in</h1>}/></Routes></AuthProvider></DashboardErrorBoundary></MemoryRouter>);for(let i=0;i<40;i++)await Promise.resolve();});}
test('invalid token returns to sign in',async()=>{fetch.mockResolvedValue(response({error:'Unauthorized'},401));await mount();expect(node.textContent).toContain('Sign in');expect(localStorage.getItem('imali_token')).toBeNull();});
test.each([403,500])('profile HTTP %s renders recovery even with stale paid cache',async(status)=>{localStorage.setItem('imali_user',JSON.stringify({id:'stale',tier:'pro',subscription_status:'active'}));fetch.mockResolvedValue(response({error:'SECRET_DETAIL'},status));await mount();expect(node.textContent).toContain("Dashboard couldn't load");expect(node.textContent).not.toContain('Member dashboard');expect(node.textContent).not.toContain('SECRET_DETAIL');});
test('profile recovery can retry successfully',async()=>{fetch.mockResolvedValue(response({},500));await mount();fetch.mockImplementation(async path=>response(path.endsWith('/api/me')?{user:{id:'user',tier:'pro',subscription_status:'active'}}:{data:{status:{}}}));await act(async()=>{node.querySelector('button').click();for(let i=0;i<40;i++)await Promise.resolve();});expect(node.textContent).toContain('Member dashboard pro');});
test.each(['null','{bad-json','{"tier":{"malformed":true},"id":"old"}'])('malformed stored session %s recovers through live profile',async cached=>{localStorage.setItem('imali_user',cached);await mount();expect(node.textContent).toContain('Member dashboard starter');});
test('null profile shows useful recovery rather than blank or trusted cache',async()=>{fetch.mockResolvedValue(response(null));await mount();expect(node.textContent).toContain("Dashboard couldn't load");});
test('malformed JSON shows recovery',async()=>{fetch.mockResolvedValue({...response({}),text:async()=>'{broken'});await mount();expect(node.textContent).toContain("Dashboard couldn't load");});
test('stalled authentication times out and ends loading',async()=>{fetch.mockImplementation((_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))));await mount();await act(async()=>{jest.advanceTimersByTime(15001);for(let i=0;i<20;i++)await Promise.resolve();});expect(node.textContent).toContain("Dashboard couldn't load");});
