// src/components/enterprise/team/TeamManagement.jsx
import React, { useState, useEffect } from 'react';
import { useEnterprise } from '../../../hooks/useEnterprise';
import { ENTERPRISE_ROLES, ROLE_LABELS, ROLE_COLORS } from '../../../constants/enterpriseRoles';
import InviteMemberModal from './InviteMemberModal';
import RoleChangeModal from './RoleChangeModal';
import RemoveMemberModal from './RemoveMemberModal';

const TeamManagement = () => {
  const { getOrganizationUsers, inviteUser, removeUser, updateUserRole, loading } = useEnterprise();
  const [members, setMembers] = useState([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const result = await getOrganizationUsers();
    if (result.success) {
      setMembers(result.data.users);
    }
  };

  const handleInvite = async (email, role) => {
    const result = await inviteUser(email, role);
    if (result.success) {
      await loadMembers();
    }
    return result;
  };

  const handleRoleChange = async (userId, newRole) => {
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      await loadMembers();
    }
    return result;
  };

  const handleRemove = async (userId) => {
    const result = await removeUser(userId);
    if (result.success) {
      await loadMembers();
    }
    return result;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      member: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.member;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your organization's team members and their roles
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Invite Member
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      User
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Joined
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {members.map((member) => (
                    <tr key={member.user_id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{member.email}</div>
                            <div className="text-gray-500">{member.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getRoleBadgeColor(member.role)}`}>
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(member.joined_at || member.invited_at).toLocaleDateString()}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setRoleModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setRemoveModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInvite}
      />

      <RoleChangeModal
        isOpen={roleModalOpen}
        member={selectedMember}
        onClose={() => {
          setRoleModalOpen(false);
          setSelectedMember(null);
        }}
        onRoleChange={handleRoleChange}
      />

      <RemoveMemberModal
        isOpen={removeModalOpen}
        member={selectedMember}
        onClose={() => {
          setRemoveModalOpen(false);
          setSelectedMember(null);
        }}
        onRemove={handleRemove}
      />
    </div>
  );
};

export default TeamManagement;