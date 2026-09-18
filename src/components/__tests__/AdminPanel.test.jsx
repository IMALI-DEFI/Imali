import React from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react-dom/test-utils';
import SocialConnections from '../admin/SocialConnections';
test('admin social controls load existing connections and queue alongside disabled Facebook',async()=>{
 global.IS_REACT_ACT_ENVIRONMENT=true;
 Object.defineProperty(global,'crypto',{configurable:true,value:{randomUUID:()=> 'admin-ui-test-123456'}});
 const host=document.createElement('div'),root=createRoot(host);
 const api={get:jest.fn(async path=>path.endsWith('/connections')?{connections:[]}:path.endsWith('/queue')?{items:[]}:{configured:true,publishing_enabled:false,page_id:'123'}),post:jest.fn()};
 try{
  await act(async()=>root.render(<SocialConnections api={api}/>));
  expect(api.get.mock.calls.map(c=>c[0])).toEqual(expect.arrayContaining(['/api/admin/social/connections','/api/admin/social/queue','/api/admin/social/facebook/status']));
  expect(host.textContent).toContain('Facebook publishing is disabled');
  expect(host.textContent).toContain('Sports Jedi');
  expect(api.post).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
