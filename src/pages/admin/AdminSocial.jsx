// Frontend/src/pages/admin/AdminSocial.jsx
import React, { useState } from 'react';
import { FaShareAlt, FaTwitter, FaFacebook, FaLinkedin, FaInstagram, FaPlus, FaEdit, FaTrash, FaCalendar } from 'react-icons/fa';

const AdminSocial = () => {
  const [posts, setPosts] = useState([
    { id: '1', platform: 'Twitter', content: 'New feature announcement coming soon! 🚀', status: 'published', date: '2026-01-15' },
    { id: '2', platform: 'LinkedIn', content: 'Our platform hit 1,000 users this week!', status: 'scheduled', date: '2026-01-20' },
    { id: '3', platform: 'Facebook', content: 'Check out our latest blog post', status: 'draft', date: null },
  ]);

  const getPlatformIcon = (platform) => {
    const map = {
      Twitter: <FaTwitter className="text-blue-400" />,
      Facebook: <FaFacebook className="text-blue-600" />,
      LinkedIn: <FaLinkedin className="text-blue-500" />,
      Instagram: <FaInstagram className="text-pink-400" />,
    };
    return map[platform] || <FaShareAlt />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Social Manager</h2>
          <p className="text-sm text-white/40">Manage social media posts across platforms</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
          <FaPlus /> Create Post
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaTwitter className="text-2xl text-blue-400 mx-auto" />
          <p className="text-sm font-semibold mt-2">Twitter</p>
          <p className="text-xs text-white/40">Connected</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaFacebook className="text-2xl text-blue-600 mx-auto" />
          <p className="text-sm font-semibold mt-2">Facebook</p>
          <p className="text-xs text-white/40">Connected</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaLinkedin className="text-2xl text-blue-500 mx-auto" />
          <p className="text-sm font-semibold mt-2">LinkedIn</p>
          <p className="text-xs text-white/40">Connected</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaInstagram className="text-2xl text-pink-400 mx-auto" />
          <p className="text-sm font-semibold mt-2">Instagram</p>
          <p className="text-xs text-white/40">Connect</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold">Scheduled Posts</h3>
        </div>
        <div className="divide-y divide-white/5">
          {posts.map((post) => (
            <div key={post.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{getPlatformIcon(post.platform)}</span>
                <div>
                  <p className="font-medium">{post.content}</p>
                  <div className="flex items-center gap-3 text-sm text-white/40">
                    <span>{post.platform}</span>
                    {post.date && <span>• <FaCalendar className="inline mr-1" />{post.date}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${post.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : post.status === 'scheduled' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {post.status}
                </span>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                  <FaEdit />
                </button>
                <button className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSocial;
