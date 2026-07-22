import { useState, useEffect } from 'react';
import { Trash2, CreditCard as Edit, Save, X, Plus, Image, FileText, Upload, Archive } from 'lucide-react';
import { getAllIssues, getArchivedIssues, getSisterMagazines, imgUrl } from '../lib/sanity';
import {
  uploadFile,
  createIssue,
  updateIssue,
  archiveIssue,
  restoreIssue,
  deleteIssue,
  createSister,
  updateSister,
  deleteSister,
} from '../lib/sanityAdmin';
import { pdfFirstPageToImage, COVER_PRESETS, coverTargetBytes, type CoverQuality } from '../lib/pdfTools';
import { gsCompressPdf, GS_PRESETS, type GsPreset } from '../lib/gsCompress';
import { defaultTitle, defaultDescription } from '../lib/issueDefaults';
import type { MagazineIssue, SisterMagazine } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import BulkUpload from '../components/BulkUpload';

export default function AdminPage() {
  const { isAdmin, writeToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'issues' | 'sisters' | 'bulk'>('issues');
  const [issues, setIssues] = useState<MagazineIssue[]>([]);
  const [archivedIssues, setArchivedIssues] = useState<MagazineIssue[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sisterMagazines, setSisterMagazines] = useState<SisterMagazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const nowMonth = new Date().getMonth() + 1;
  const nowYear = new Date().getFullYear();
  const [jild, setJild] = useState(1);
  const [shumara, setShumara] = useState(nowMonth);
  const [issueForm, setIssueForm] = useState({
    title: defaultTitle(nowMonth, nowYear),
    description: defaultDescription(1, nowMonth, nowYear),
    issue_month: nowMonth,
    issue_year: nowYear,
    publish_date: new Date().toISOString().split('T')[0],
    featured: false
  });

  // Regenerate auto title/description when month, year, jild or shumara changes.
  // Changing the month resets shumara to the month number (override via its dropdown).
  const setIssueMeta = (
    patch: Partial<{ issue_month: number; issue_year: number; jild: number; shumara: number }>
  ) => {
    const month = patch.issue_month ?? issueForm.issue_month;
    const year = patch.issue_year ?? issueForm.issue_year;
    const j = patch.jild ?? jild;
    const sh = patch.shumara ?? (patch.issue_month !== undefined ? month : shumara);
    if (patch.jild !== undefined) setJild(patch.jild);
    setShumara(sh);
    setIssueForm({
      ...issueForm,
      issue_month: month,
      issue_year: year,
      title: defaultTitle(month, year),
      description: defaultDescription(j, month, year, sh),
      publish_date: `${year}-${String(month).padStart(2, '0')}-01`,
    });
  };
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [compressEnabled, setCompressEnabled] = useState(true);
  const [gsPreset, setGsPreset] = useState<GsPreset>('/ebook');
  const [coverQuality, setCoverQuality] = useState<CoverQuality>('small');
  // Cache: real compressed result per preset, reused on Save
  const [compressed, setCompressed] = useState<File | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  // Auto-generated cover (from PDF page 1) preview
  const [autoCover, setAutoCover] = useState<File | null>(null);
  const [autoCoverUrl, setAutoCoverUrl] = useState<string | null>(null);

  // Live preview: run real Ghostscript compression when PDF or preset changes,
  // then generate the auto cover from the result
  useEffect(() => {
    setCompressed(null);
    setAutoCover(null);
    if (!pdfFile) return;
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(async () => {
      try {
        const result = compressEnabled ? await gsCompressPdf(pdfFile, gsPreset) : pdfFile;
        if (cancelled) return;
        setCompressed(result);
        if (!coverFile) {
          const cover = await pdfFirstPageToImage(result, coverTargetBytes(coverQuality));
          if (!cancelled) setAutoCover(cover);
        }
      } catch (err) {
        console.error('Compression preview failed:', err);
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pdfFile, gsPreset, compressEnabled, coverFile, coverQuality]);

  // Object URLs for the previews (revoked on change)
  useEffect(() => {
    if (!compressed) {
      setPdfPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(compressed);
    setPdfPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [compressed]);

  useEffect(() => {
    const source = coverFile ?? autoCover;
    if (!source) {
      setAutoCoverUrl(null);
      return;
    }
    const url = URL.createObjectURL(source);
    setAutoCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile, autoCover]);

  const [sisterForm, setSisterForm] = useState({
    name: '',
    website_url: '',
    description: '',
    display_order: 0,
    active: true
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [issuesData, archivedData, sistersData] = await Promise.all([
        getAllIssues(),
        getArchivedIssues(),
        getSisterMagazines(false),
      ]);
      setIssues(issuesData);
      setArchivedIssues(archivedData);
      setSisterMagazines(sistersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !writeToken) {
      alert('Only admins can create or update issues.');
      return;
    }
    if (!editingId && !pdfFile) {
      alert('Please select a PDF file.');
      return;
    }

    try {
      setSaving(true);
      let coverImageAssetId: string | undefined;
      let pdfAssetId: string | undefined;

      // Use the already-compressed preview result if available, else compress now
      let finalPdf = pdfFile;
      if (finalPdf && compressEnabled) {
        if (compressed) {
          finalPdf = compressed;
        } else {
          setUploadStatus(`Compressing PDF (${(finalPdf.size / 1024 / 1024).toFixed(1)} MB) with Ghostscript...`);
          finalPdf = await gsCompressPdf(finalPdf, gsPreset);
        }
      }

      // Cover: chosen image > previewed auto-cover > freshly generated
      let finalCover = coverFile ?? autoCover;
      if (!finalCover && finalPdf) {
        setUploadStatus('Generating cover from PDF first page...');
        try {
          finalCover = await pdfFirstPageToImage(finalPdf, coverTargetBytes(coverQuality));
        } catch (err) {
          console.error('Auto-cover failed:', err);
          alert('Could not generate a cover from the PDF first page. Please choose a cover image manually.');
          return;
        }
      }

      if (finalCover) {
        setUploadStatus('Uploading cover image...');
        coverImageAssetId = (await uploadFile(writeToken, finalCover)).assetId;
      }
      if (finalPdf) {
        setUploadStatus(`Uploading PDF (${(finalPdf.size / 1024 / 1024).toFixed(1)} MB)... this can take a while`);
        pdfAssetId = (await uploadFile(writeToken, finalPdf)).assetId;
      }
      setUploadStatus('Saving issue...');

      const base = {
        title: issueForm.title,
        description: issueForm.description,
        issueMonth: issueForm.issue_month,
        issueYear: issueForm.issue_year,
        publishDate: issueForm.publish_date,
        featured: issueForm.featured,
      };

      if (editingId) {
        await updateIssue(writeToken, editingId, {
          ...base,
          coverImageAssetId,
          pdfAssetId,
        });
      } else {
        await createIssue(writeToken, {
          ...base,
          coverImageAssetId: coverImageAssetId!,
          pdfAssetId: pdfAssetId!,
        });
      }

      resetIssueForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving issue:', error);
      alert(`Error saving issue: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
      setUploadStatus('');
    }
  };

  const handleSisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !writeToken) {
      alert('Only admins can create or update sister magazines.');
      return;
    }
    if (!editingId && !logoFile) {
      alert('Please select a logo image.');
      return;
    }

    try {
      setSaving(true);
      let logoAssetId: string | undefined;
      if (logoFile) {
        setUploadStatus('Uploading logo...');
        logoAssetId = (await uploadFile(writeToken, logoFile)).assetId;
      }
      setUploadStatus('Saving...');

      const base = {
        name: sisterForm.name,
        websiteUrl: sisterForm.website_url,
        description: sisterForm.description,
        displayOrder: sisterForm.display_order,
        active: sisterForm.active,
      };

      if (editingId) {
        await updateSister(writeToken, editingId, { ...base, logoAssetId });
      } else {
        await createSister(writeToken, { ...base, logoAssetId: logoAssetId! });
      }

      resetSisterForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving sister magazine:', error);
      alert(`Error saving sister magazine: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
      setUploadStatus('');
    }
  };

  // Safe delete: archive (hidden from public site, restorable from Archived list)
  const handleArchiveIssue = async (id: string) => {
    if (!isAdmin || !writeToken) return;
    if (!confirm('Archive this issue? It will be hidden from the website but can be restored anytime.')) return;
    try {
      setDeletingId(id);
      await archiveIssue(writeToken, id);
      loadData();
    } catch (error: any) {
      console.error('Error archiving issue:', error);
      alert(`Error archiving issue: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreIssue = async (id: string) => {
    if (!isAdmin || !writeToken) return;
    try {
      setDeletingId(id);
      await restoreIssue(writeToken, id);
      loadData();
    } catch (error: any) {
      console.error('Error restoring issue:', error);
      alert(`Error restoring issue: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Permanent delete, only from the Archived list
  const handleDeleteIssue = async (id: string) => {
    if (!isAdmin || !writeToken) return;
    if (!confirm('PERMANENTLY delete this issue? This cannot be undone.')) return;
    try {
      setDeletingId(id);
      await deleteIssue(writeToken, id);
      loadData();
    } catch (error: any) {
      console.error('Error deleting issue:', error);
      alert(`Error deleting issue: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSister = async (id: string) => {
    if (!isAdmin || !writeToken) return;
    if (!confirm('Are you sure you want to delete this sister magazine?')) return;
    try {
      setDeletingId(id);
      await deleteSister(writeToken, id);
      loadData();
    } catch (error: any) {
      console.error('Error deleting sister magazine:', error);
      alert(`Error deleting sister magazine: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Current assets of the issue being edited (for preview when no new file chosen)
  const [editingIssue, setEditingIssue] = useState<MagazineIssue | null>(null);

  const startEditIssue = (issue: MagazineIssue) => {
    if (!isAdmin) return;
    setEditingIssue(issue);
    setIssueForm({
      title: issue.title,
      description: issue.description,
      issue_month: issue.issue_month,
      issue_year: issue.issue_year,
      publish_date: issue.publish_date,
      featured: issue.featured
    });
    setCoverFile(null);
    setPdfFile(null);
    setEditingId(issue.id);
    setShowForm(true);
    setActiveTab('issues');
  };

  const startEditSister = (sister: SisterMagazine) => {
    if (!isAdmin) return;
    setSisterForm({
      name: sister.name,
      website_url: sister.website_url,
      description: sister.description,
      display_order: sister.display_order,
      active: sister.active
    });
    setLogoFile(null);
    setEditingId(sister.id);
    setShowForm(true);
    setActiveTab('sisters');
  };

  const freshIssueForm = () => {
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    return {
      title: defaultTitle(m, y),
      description: defaultDescription(jild, m, y),
      issue_month: m,
      issue_year: y,
      publish_date: `${y}-${String(m).padStart(2, '0')}-01`,
      featured: false
    };
  };

  const resetIssueForm = () => {
    setIssueForm(freshIssueForm());
    setCoverFile(null);
    setPdfFile(null);
    setEditingIssue(null);
    setEditingId(null);
    setShowForm(false);
  };

  const resetSisterForm = () => {
    setSisterForm({
      name: '',
      website_url: '',
      description: '',
      display_order: 0,
      active: true
    });
    setLogoFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  if (loading) {
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
            <p className="text-yellow-800">Please log in as an admin to manage content.</p>
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
              <button
                onClick={() => setActiveTab('bulk')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'bulk'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bulk Upload
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'bulk' ? (
              <div className="space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bulk-compress"
                      checked={compressEnabled}
                      onChange={(e) => setCompressEnabled(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                    />
                    <label htmlFor="bulk-compress" className="text-sm font-medium text-gray-700">
                      Compress PDFs before upload
                    </label>
                  </div>
                  {compressEnabled && <PresetPicker value={gsPreset} onChange={setGsPreset} />}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Cover quality:</span>
                    <select
                      value={coverQuality}
                      onChange={(e) => setCoverQuality(e.target.value as CoverQuality)}
                      className="px-3 py-1.5 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                    >
                      {COVER_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <BulkUpload
                  writeToken={writeToken!}
                  compressEnabled={compressEnabled}
                  gsPreset={gsPreset}
                  coverQuality={coverQuality}
                  onDone={loadData}
                />
              </div>
            ) : !showForm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(true);
                    setEditingId(null);
                    if (activeTab === 'issues') {
                      setIssueForm(freshIssueForm());
                      setCoverFile(null);
                      setPdfFile(null);
                    } else {
                      setSisterForm({
                        name: '',
                        website_url: '',
                        description: '',
                        display_order: 0,
                        active: true
                      });
                      setLogoFile(null);
                    }
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
                          src={imgUrl(issue.cover_image_url, 150)} loading="lazy"
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
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleArchiveIssue(issue.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Archive (safe delete - restorable)"
                            disabled={deletingId === issue.id}
                          >
                            <Archive className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {archivedIssues.length > 0 && (
                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={() => setShowArchived(!showArchived)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                          Archived issues ({archivedIssues.length}) {showArchived ? '▾' : '▸'}
                        </button>
                        {showArchived && (
                          <div className="mt-4 space-y-3">
                            {archivedIssues.map((issue) => (
                              <div
                                key={issue.id}
                                className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"
                              >
                                <img
                                  src={imgUrl(issue.cover_image_url, 150)} loading="lazy"
                                  alt={issue.title}
                                  className="w-12 h-16 object-cover rounded-lg opacity-60"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-600 truncate">{issue.title}</h3>
                                  <p className="text-sm text-gray-500">
                                    {getMonthName(issue.issue_month)} {issue.issue_year}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRestoreIssue(issue.id)}
                                    className="px-3 py-1.5 text-sm font-medium text-green-700 border-2 border-green-200 hover:bg-green-50 rounded-lg transition-colors"
                                    disabled={deletingId === issue.id}
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={() => handleDeleteIssue(issue.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete permanently"
                                    disabled={deletingId === issue.id}
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sisterMagazines.map((sister) => (
                      <div
                        key={sister.id}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-red-600 transition-all"
                      >
                        <img
                          src={imgUrl(sister.logo_url, 150)} loading="lazy"
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
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSister(sister.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                            disabled={deletingId === sister.id}
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

                {saving && uploadStatus && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <p className="text-blue-800 text-sm font-medium">{uploadStatus}</p>
                  </div>
                )}

                {activeTab === 'issues' ? (
                  <form onSubmit={handleIssueSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title <span className="text-xs text-gray-400">(auto-fills from جلد/Month/Year - editable)</span>
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-xs text-gray-400">(auto-fills - editable)</span>
                      </label>
                      <textarea
                        value={issueForm.description}
                        onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                        rows={2}
                        dir="rtl"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors font-urdu"
                        placeholder="Brief description"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Image className="w-4 h-4 inline mr-1" />
                          Cover Image {editingId ? '(leave empty to keep current)' : '(optional - PDF first page used if empty)'}
                        </label>
                        <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-red-600 cursor-pointer transition-colors">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600 truncate">
                            {coverFile ? coverFile.name : 'Choose image...'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FileText className="w-4 h-4 inline mr-1" />
                          PDF File {editingId && '(leave empty to keep current)'}
                        </label>
                        <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-red-600 cursor-pointer transition-colors">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600 truncate">
                            {pdfFile ? `${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(1)} MB)` : 'Choose PDF...'}
                          </span>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                    </div>

                    {editingIssue && !pdfFile && !coverFile && (
                      <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <img
                          src={imgUrl(editingIssue.cover_image_url, 150)}
                          alt="Current cover"
                          className="w-16 h-20 object-cover rounded-lg shadow"
                        />
                        <div className="flex-1 text-sm text-blue-900">
                          <p className="font-medium">Current files (kept unless you choose new ones)</p>
                          <a
                            href={editingIssue.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-700"
                          >
                            Open current PDF
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="compress"
                          checked={compressEnabled}
                          onChange={(e) => setCompressEnabled(e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                        />
                        <label htmlFor="compress" className="text-sm font-medium text-gray-700">
                          Compress PDF before upload (recommended for scanned magazines)
                        </label>
                      </div>
                      {compressEnabled && <PresetPicker value={gsPreset} onChange={setGsPreset} />}
                      {!coverFile && pdfFile && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 whitespace-nowrap">Cover quality:</span>
                          <select
                            value={coverQuality}
                            onChange={(e) => setCoverQuality(e.target.value as CoverQuality)}
                            className="px-3 py-1.5 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                          >
                            {COVER_PRESETS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {compressEnabled && pdfFile && (
                        <div className="flex items-center gap-2 text-sm">
                          {estimating ? (
                            <span className="flex items-center gap-2 text-gray-500">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                              Compressing to preview size...
                            </span>
                          ) : compressed ? (
                            <span className={compressed.size < pdfFile.size ? 'text-green-700 font-medium' : 'text-orange-700 font-medium'}>
                              {(pdfFile.size / 1024 / 1024).toFixed(1)} MB → {(compressed.size / 1024 / 1024).toFixed(1)} MB
                              {' '}({compressed.size < pdfFile.size
                                ? `${Math.round((1 - compressed.size / pdfFile.size) * 100)}% smaller`
                                : 'no saving - original will be kept'})
                            </span>
                          ) : null}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Real Ghostscript compression - text stays selectable. The smaller of original/compressed is uploaded automatically.
                      </p>
                    </div>

                    {pdfFile && (compressed || autoCoverUrl) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pdfPreviewUrl && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Preview - check the quality before saving
                            </label>
                            <iframe
                              src={`${pdfPreviewUrl}#view=FitH`}
                              title="Compressed PDF preview"
                              className="w-full h-96 rounded-xl border-2 border-gray-200"
                            />
                          </div>
                        )}
                        {autoCoverUrl && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Cover {coverFile
                                ? `(your image, ${((coverFile.size) / 1024).toFixed(0)} KB)`
                                : autoCover
                                ? `(auto from page 1, ${(autoCover.size / 1024).toFixed(1)} KB)`
                                : ''}
                            </label>
                            <img
                              src={autoCoverUrl}
                              alt="Cover preview"
                              className="w-full rounded-xl border-2 border-gray-200 object-contain bg-gray-50"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">شمارہ (Issue)</label>
                        <select
                          value={shumara}
                          onChange={(e) => setIssueMeta({ shumara: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        >
                          {Array.from({ length: 99 }, (_, i) => i + 1).map((s) => (
                            <option key={s} value={s}>{String(s).padStart(2, '0')}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">جلد (Volume)</label>
                        <select
                          value={jild}
                          onChange={(e) => setIssueMeta({ jild: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        >
                          {Array.from({ length: 99 }, (_, i) => i + 1).map((j) => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                        <select
                          value={issueForm.issue_month}
                          onChange={(e) => setIssueMeta({ issue_month: Number(e.target.value) })}
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
                        <select
                          value={issueForm.issue_year}
                          onChange={(e) => setIssueMeta({ issue_year: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
                        >
                          {Array.from(
                            { length: new Date().getFullYear() + 2 - 1964 },
                            (_, i) => new Date().getFullYear() + 1 - i
                          ).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
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
                        {saving ? 'Saving...' : `${editingId ? 'Update' : 'Create'} Issue`}
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
                        Logo {editingId && '(leave empty to keep current)'}
                      </label>
                      <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-red-600 cursor-pointer transition-colors">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600 truncate">
                          {logoFile ? logoFile.name : 'Choose image...'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
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
                        {saving ? 'Saving...' : `${editingId ? 'Update' : 'Create'} Sister Magazine`}
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
          <h3 className="font-semibold text-blue-900 mb-2">Upload Tips</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Compress your PDF before uploading (e.g. ilovepdf.com or Ghostscript) to save storage and make reading faster</li>
            <li>Files upload directly to Sanity - large PDFs may take a minute</li>
            <li>Cover images: JPG/PNG, ideally under 1 MB</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function PresetPicker({ value, onChange }: { value: GsPreset; onChange: (p: GsPreset) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {GS_PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          title={p.hint}
          className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
            value === p.value
              ? 'border-red-600 bg-red-50 text-red-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
