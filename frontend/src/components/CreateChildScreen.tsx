import React, { useState } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { guardianApi } from '../services/api';

interface CreateChildScreenProps {
  onBack: () => void;
  onCreated: () => void;
}

export function CreateChildScreen({ onBack, onCreated }: CreateChildScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    userName: '',
    password: '',
    ageGroup: '6-8' as '3-5' | '6-8' | '9-12',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await guardianApi.createChild(form);
      if (response.success) {
        toast.success('Child account created successfully!');
        onCreated();
        return;
      }
      toast.error(response.message || 'Failed to create child account');
    } catch {
      toast.error('An error occurred while creating the child account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-4 border-green-200">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-purple-800">Create Child Account</h1>
                <p className="text-gray-600 text-sm">This child will be linked to you</p>
              </div>
            </div>

            <div className="w-[88px]" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-8 border-4 border-green-200">
          <div className="space-y-5">
            <div>
              <label className="block text-purple-800 font-semibold mb-2">Username</label>
              <input
                type="text"
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                placeholder="Enter child's username"
                required
              />
            </div>

            <div>
              <label className="block text-purple-800 font-semibold mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                placeholder="Create a password"
                required
              />
            </div>

            <div>
              <label className="block text-purple-800 font-semibold mb-2">Age Group</label>
              <select
                value={form.ageGroup}
                onChange={(e) => setForm({ ...form, ageGroup: e.target.value as '3-5' | '6-8' | '9-12' })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
              >
                <option value="3-5">3-5 years old</option>
                <option value="6-8">6-8 years old</option>
                <option value="9-12">9-12 years old</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
