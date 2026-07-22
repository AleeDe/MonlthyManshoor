import { useEffect, useState } from 'react';
import { ArrowLeft, Download, ChevronLeft, ChevronRight, Calendar, BookOpen } from 'lucide-react';
import { getIssueById, getAllIssues, imgUrl } from '../lib/sanity';
import type { MagazineIssue } from '../lib/database.types';
import IssueDetailSkeleton from '../components/IssueDetailSkeleton';
import PdfReader from '../components/PdfReader';
import { setSeo } from '../lib/seo';

interface IssueDetailPageProps {
  issueId: string;
  onNavigate: (page: string, issueId?: string) => void;
}

export default function IssueDetailPage({ issueId, onNavigate }: IssueDetailPageProps) {
  const [issue, setIssue] = useState<MagazineIssue | null>(null);
  const [prevIssue, setPrevIssue] = useState<MagazineIssue | null>(null);
  const [nextIssue, setNextIssue] = useState<MagazineIssue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIssue();
  }, [issueId]);

  const loadIssue = async () => {
    try {
      const [currentIssue, all] = await Promise.all([
        getIssueById(issueId),
        getAllIssues(), // sorted publish_date desc
      ]);

      if (currentIssue) {
        setIssue(currentIssue);
        setSeo({
          title: currentIssue.title,
          description: currentIssue.description || undefined,
          image: imgUrl(currentIssue.cover_image_url, 800),
          url: window.location.href,
        });
        const idx = all.findIndex((i) => i.id === currentIssue.id);
        // list is desc: next (newer) is idx-1, prev (older) is idx+1
        setNextIssue(idx > 0 ? all[idx - 1] : null);
        setPrevIssue(idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null);
      }
    } catch (error) {
      console.error('Error loading issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const handleDownload = () => {
    if (issue) {
      window.open(issue.pdf_url, '_blank');
    }
  };

  if (loading) return <IssueDetailSkeleton />;

  if (!issue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-16">
        <p className="text-xl text-gray-600 mb-4">Issue not found</p>
        <button
          onClick={() => onNavigate('archive')}
          className="text-red-600 hover:text-red-700 font-medium"
        >
          Back to Archive
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('archive')}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Archive
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="bg-white p-6 rounded-3xl shadow-xl">
                <img
                  src={imgUrl(issue.cover_image_url, 600)}
                  alt={issue.title}
                  className="w-full h-auto rounded-2xl shadow-lg mb-6"
                />

                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{issue.title}</h1>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{getMonthName(issue.issue_month)} {issue.issue_year}</span>
                    </div>
                  </div>

                  {issue.description && (
                    <div>
                      <p className="text-gray-700 leading-relaxed">{issue.description}</p>
                    </div>
                  )}

                  <button
                    onClick={handleDownload}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:shadow-2xl hover:shadow-red-600/40 transition-all duration-300 hover:scale-105"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Read Online</h2>
              </div>

              <div className="p-4">
                <PdfReader url={issue.pdf_url} title={issue.title} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Navigate Issues</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prevIssue ? (
              <button
                onClick={() => onNavigate('issue', prevIssue.id)}
                className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-red-600 hover:shadow-xl transition-all duration-300 text-left"
              >
                <ChevronLeft className="w-8 h-8 text-red-600 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 mb-1">Previous Issue</p>
                  <p className="font-semibold text-gray-900 truncate">{prevIssue.title}</p>
                  <p className="text-sm text-gray-600">{getMonthName(prevIssue.issue_month)} {prevIssue.issue_year}</p>
                </div>
                <img
                  src={imgUrl(prevIssue.cover_image_url, 200)} loading="lazy"
                  alt={prevIssue.title}
                  className="w-16 h-20 object-cover rounded-lg shadow-md"
                />
              </button>
            ) : (
              <div className="flex items-center justify-center p-6 rounded-2xl border-2 border-gray-200 text-gray-400">
                <p>No previous issue</p>
              </div>
            )}

            {nextIssue ? (
              <button
                onClick={() => onNavigate('issue', nextIssue.id)}
                className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-red-600 hover:shadow-xl transition-all duration-300 text-left"
              >
                <img
                  src={imgUrl(nextIssue.cover_image_url, 200)} loading="lazy"
                  alt={nextIssue.title}
                  className="w-16 h-20 object-cover rounded-lg shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 mb-1">Next Issue</p>
                  <p className="font-semibold text-gray-900 truncate">{nextIssue.title}</p>
                  <p className="text-sm text-gray-600">{getMonthName(nextIssue.issue_month)} {nextIssue.issue_year}</p>
                </div>
                <ChevronRight className="w-8 h-8 text-red-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="flex items-center justify-center p-6 rounded-2xl border-2 border-gray-200 text-gray-400">
                <p>No next issue</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
