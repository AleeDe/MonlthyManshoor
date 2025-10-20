import { useState, useEffect } from 'react';
import { Upload, Trash2, CreditCard as Edit, Save, X, Plus, Image, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { MagazineIssue, SisterMagazine } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'issues' | 'sisters'>('issues');
  const [issues, setIssues] = useState<MagazineIssue[]>([]);
  const [sisterMagazines, setSisterMagazines] = useState<SisterMagazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    cover_image_url: '',
    pdf_url: '',
    issue_month: new Date().getMonth() + 1,
    issue_year: new Date().getFullYear(),
    publish_date: new Date().toISOString().split('T')[0],
    featured: false
  });

  const [sisterForm, setSisterForm] = useState({
    name: '',
    logo_url: '',
    website_url: '',
    description: '',
    display_order: 0,
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [issuesResponse, sistersResponse] = await Promise.all([
        supabase.from('magazine_issues').select('*').order('publish_date', { ascending: false }),
        supabase.from('sister_magazines').select('*').order('display_order', { ascending: true })
      ]);

      if (issuesResponse.data) setIssues(issuesResponse.data);
      if (sistersResponse.data) setSisterMagazines(sistersResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only admins can create or update issues.');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const { error } = await (supabase as any)
          .from('magazine_issues')
          .update({ ...issueForm, updated_at: new Date().toISOString() })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('magazine_issues')
          .insert([issueForm]);

        if (error) throw error;
      }

      resetIssueForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving issue:', error);
      alert(`Error saving issue: ${error?.message || 'Unknown error'}`);
    }
    finally {
      setSaving(false);
    }
  };

  const handleSisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only admins can create or update sister magazines.');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const { error } = await (supabase as any)
          .from('sister_magazines')
          .update(sisterForm)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('sister_magazines')
          .insert([sisterForm]);

        if (error) throw error;
      }

      resetSisterForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving sister magazine:', error);
      alert(`Error saving sister magazine: ${error?.message || 'Unknown error'}`);
    }
    finally {
      setSaving(false);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!isAdmin) {
      alert('Only admins can delete issues.');
      return;
    }
    if (!confirm('Are you sure you want to delete this issue?')) return;

    try {
      setDeletingId(id);
      const { error } = await (supabase as any)
        .from('magazine_issues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting issue:', error);
      alert(`Error deleting issue: ${(error as any)?.message || 'Unknown error'}`);
    }
    finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSister = async (id: string) => {
    if (!isAdmin) {
      alert('Only admins can delete sister magazines.');
      return;
    }
    if (!confirm('Are you sure you want to delete this sister magazine?')) return;

    try {
      setDeletingId(id);
      const { error } = await (supabase as any)
        .from('sister_magazines')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting sister magazine:', error);
      alert(`Error deleting sister magazine: ${(error as any)?.message || 'Unknown error'}`);
    }
    finally {
      setDeletingId(null);
    }
  };

  const startEditIssue = (issue: MagazineIssue) => {
    if (!isAdmin) return;
    setIssueForm({
      title: issue.title,
      description: issue.description,
      cover_image_url: issue.cover_image_url,
      pdf_url: issue.pdf_url,
      issue_month: issue.issue_month,
      issue_year: issue.issue_year,
      publish_date: issue.publish_date,
      featured: issue.featured
    });
    setEditingId(issue.id);
    setShowForm(true);
    setActiveTab('issues');
  };

  const startEditSister = (sister: SisterMagazine) => {
    if (!isAdmin) return;
    setSisterForm({
      name: sister.name,
      logo_url: sister.logo_url,
      website_url: sister.website_url,
      description: sister.description,
      display_order: sister.display_order,
      active: sister.active
    });
    setEditingId(sister.id);
    setShowForm(true);
    setActiveTab('sisters');
  };

  const resetIssueForm = () => {
    setIssueForm({
      title: '',
      description: '',
      cover_image_url: '',
      pdf_url: '',
      issue_month: new Date().getMonth() + 1,
      issue_year: new Date().getFullYear(),
      publish_date: new Date().toISOString().split('T')[0],
      featured: false
    });
    setEditingId(null);
    setShowForm(false);
  };

  const resetSisterForm = () => {
    setSisterForm({
      name: '',
      logo_url: '',
      website_url: '',
      description: '',
      display_order: 0,
      active: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Initialize forms without closing the form UI
  const initNewIssueForm = () => {
    setIssueForm({
      title: '',
      description: '',
      cover_image_url: '',
      pdf_url: '',
      issue_month: new Date().getMonth() + 1,
      issue_year: new Date().getFullYear(),
      publish_date: new Date().toISOString().split('T')[0],
      featured: false
    });
  };

  const initNewSisterForm = () => {
    setSisterForm({
      name: '',
      logo_url: '',
      website_url: '',
      description: '',
      display_order: 0,
      active: true
    });
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-8 text-center">
            <h1 className="text-2xl font-bold text-yellow-900 mb-2">Admin Access Required</h1>
            <p className="text-yellow-800">Please log in as an admin to manage content. If you are the owner, use the Admin Login from the footer and then refresh.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage magazine issues and sister publications</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('issues')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'issues'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Magazine issues ({issues.length})
              </button>
              <button
                onClick={() => setActiveTab('sisters')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'sisters'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sister Publications ({sisterMagazines.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {!showForm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    console.log('Add New clicked', { tab: activeTab });
                    setShowForm(true);
                    setEditingId(null);
                    if (activeTab === 'issues') initNewIssueForm();
                    else initNewSisterForm();
                  }}
                  disabled={saving}
                  className="mb-6 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  Add New {activeTab === 'issues' ? 'Issue' : 'Sister Magazine'}
                </button>

                {activeTab === 'issues' ? (
                  <div className="space-y-4">
                    {issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-red-600 transition-all"
                      >
                        <img
                          src={issue.cover_image_url}
                          alt={issue.title}
                          className="w-16 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{issue.title}</h3>
                          <p className="text-sm text-gray-600">
                            {getMonthName(issue.issue_month)} {issue.issue_year}
                          </p>
                          {issue.featured && (
                            <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditIssue(issue)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                            disabled={!isAdmin}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteIssue(issue.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                            disabled={!isAdmin || deletingId === issue.id}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sisterMagazines.map((sister) => (
                      <div
                        key={sister.id}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-red-600 transition-all"
                      >
                        <img
                          src={sister.logo_url}
                          alt={sister.name}
                          className="w-16 h-16 object-contain rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{sister.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{sister.website_url}</p>
                          {!sister.active && (
                            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditSister(sister)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                            disabled={!isAdmin}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSister(sister.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                            disabled={!isAdmin || deletingId === sister.id}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingId ? 'Edit' : 'Add New'} {activeTab === 'issues' ? 'Issue' : 'Sister Magazine'}
                  </h2>
                  <button
                    onClick={activeTab === 'issues' ? resetIssueForm : resetSisterForm}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {activeTab === 'issues' ? (
                  <form onSubmit={handleIssueSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        required
                        value={issueForm.title}
                        onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        placeholder="Issue title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={issueForm.description}
                        onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        placeholder="Brief description"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Image className="w-4 h-4 inline mr-1" />
                          Cover Image URL (Cloudinary)
                        </label>
                        <input
                          type="url"
                          required
                          value={issueForm.cover_image_url}
                          onChange={(e) => setIssueForm({ ...issueForm, cover_image_url: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                          placeholder="https://res.cloudinary.com/..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FileText className="w-4 h-4 inline mr-1" />
                          PDF URL (Cloudinary)
                        </label>
                        <input
                          type="url"
                          required
                          value={issueForm.pdf_url}
                          onChange={(e) => setIssueForm({ ...issueForm, pdf_url: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                          placeholder="https://res.cloudinary.com/..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                        <select
                          value={issueForm.issue_month}
                          onChange={(e) => setIssueForm({ ...issueForm, issue_month: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>
                              {getMonthName(month)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                        <input
                          type="number"
                          required
                          min="1980"
                          max="2100"
                          value={issueForm.issue_year}
                          onChange={(e) => setIssueForm({ ...issueForm, issue_year: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                        <input
                          type="date"
                          required
                          value={issueForm.publish_date}
                          onChange={(e) => setIssueForm({ ...issueForm, publish_date: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={issueForm.featured}
                        onChange={(e) => setIssueForm({ ...issueForm, featured: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                      />
                      <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                        Feature on homepage
                      </label>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-5 h-5" />
                        {editingId ? 'Update' : 'Create'} Issue
                      </button>
                      <button
                        type="button"
                        onClick={resetIssueForm}
                        className="px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSisterSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        required
                        value={sisterForm.name}
                        onChange={(e) => setSisterForm({ ...sisterForm, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        placeholder="Magazine name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Image className="w-4 h-4 inline mr-1" />
                        Logo URL (Cloudinary)
                      </label>
                      <input
                        type="url"
                        required
                        value={sisterForm.logo_url}
                        onChange={(e) => setSisterForm({ ...sisterForm, logo_url: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        placeholder="https://res.cloudinary.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                      <input
                        type="url"
                        value={sisterForm.website_url}
                        onChange={(e) => setSisterForm({ ...sisterForm, website_url: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={sisterForm.description}
                        onChange={(e) => setSisterForm({ ...sisterForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        placeholder="Brief description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={sisterForm.display_order}
                        onChange={(e) => setSisterForm({ ...sisterForm, display_order: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="active"
                        checked={sisterForm.active}
                        onChange={(e) => setSisterForm({ ...sisterForm, active: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                      />
                      <label htmlFor="active" className="text-sm font-medium text-gray-700">
                        Active
                      </label>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-5 h-5" />
                        {editingId ? 'Update' : 'Create'} Sister Magazine
                      </button>
                      <button
                        type="button"
                        onClick={resetSisterForm}
                        className="px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Cloudinary Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Upload your PDF and cover image to Cloudinary</li>
            <li>Copy the full URL from Cloudinary (should start with https://res.cloudinary.com/)</li>
            <li>Paste the URLs in the form fields above</li>
            <li>For PDFs, ensure the URL ends with the .pdf extension</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
