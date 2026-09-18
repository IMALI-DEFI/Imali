import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import {useAuth} from '../context/AuthContext';
jest.mock('../context/AuthContext',()=>({useAuth:jest.fn()}));
jest.mock('react-router-dom',()=>({useLocation:()=>({pathname:'/admin/social'}),Navigate:({to})=><span>Redirect: {to}</span>}));
test('signed-out visitors are sent to login before protected content renders',()=>{
 useAuth.mockReturnValue({loading:false,isAuthenticated:false,user:null});
 const html=renderToStaticMarkup(<ProtectedRoute><div>Private controls</div></ProtectedRoute>);
 expect(html).toContain('/login');expect(html).not.toContain('Private controls');
});
test('authenticated administrators retain access to protected content',()=>{
 useAuth.mockReturnValue({loading:false,isAuthenticated:true,user:{id:'admin'},isAdmin:true});
 expect(renderToStaticMarkup(<ProtectedRoute><div>Private controls</div></ProtectedRoute>)).toContain('Private controls');
});
