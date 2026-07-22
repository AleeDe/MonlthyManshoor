import { useEffect, useState, useRef } from 'react';
import { Search, Filter } from 'lucide-react';
import { getAllIssues, imgUrl } from '../lib/sanity';
import type { MagazineIssue } from '../lib/database.types';
import ArchiveSkeleton from '../components/ArchiveSkeleton';
import { setSeo } from '../lib/seo';

interface ArchivePageProps {
  onNavigate: (page: string, issueId?: string) => void;
}

export default function ArchivePage({ onNavigate }: ArchivePageProps) {
  const [issues, setIssues] = useState<MagazineIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<MagazineIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  // Infinite scroll: show `visibleCount` cards, grow when sentinel enters view
  const [visibleCount, setVisibleCount] = useState(18);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadIssues();
  }, []);

  useEffect(() => {
    setSeo({ title: 'Archive', description: 'Browse and read all issues of Monthly Manshoor from the digital archive.' });
  }, []);

  useEffect(() => {
    filterIssues();
  }, [issues, searchQuery, selectedYear, selectedMonth]);

  const loadIssues = async () => {
    try {
      const data = await getAllIssues();
      const typed = [...data].sort(
        (a, b) => b.issue_year - a.issue_year || b.issue_month - a.issue_month
      );
      setIssues(typed);
      const years = [...new Set(typed.map(issue => issue.issue_year))].sort((a, b) => b - a);
      setAvailableYears(years);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterIssues = () => {
    let filtered = [...issues];

    if (searchQuery) {
      filtered = filtered.filter(issue =>
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(issue => issue.issue_year === selectedYear);
    }

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(issue => issue.issue_month === selectedMonth);
    }

    setFilteredIssues(filtered);
    setVisibleCount(18);
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const paginatedIssues = filteredIssues.slice(0, visibleCount);
  const hasMore = visibleCount < filteredIssues.length;

  // Load more when the sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + 18);
        }
      },
      { rootMargin: '400px' } // start loading before the user reaches the end
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, paginatedIssues.length]);

  if (loading) return <ArchiveSkeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* faint background logo behind header */}
        <img src="/hero-logo.png" alt="" aria-hidden className="pointer-events-none select-none absolute left-1/2 top-20 transform -translate-x-1/2 w-72 opacity-5 sm:opacity-8 md:w-96 md:opacity-12 lg:w-[28rem] lg:opacity-18 mix-blend-multiply" />
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-700">"Manshoor"</span> Pakistan’s Oldest Progressive Socio-Economic and Literary Journal
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-red-600 to-red-500 rounded-full mx-auto mb-6"></div>
          
          <p className="text-lg text-gray-600 font-urdu text-center" dir="rtl">
            ماہنامہ <span className="text-red-700">منشور</span><br />
            ترقی پسند فکر کا ترجمان<br />
            چھ دہائیوں کی اشاعت اور مزاحمت کا جاری سفر
          </p>
          <div className="mt-8  inline-block px-4 py-2 rounded-2xl">
            <p className="font-urdu text-base sm:text-lg md:text-xl text-red-700 leading-snug text-center" dir="rtl">
              <br /><br /><br />ہم صبح پرستوں کی یہ ریت پرانی ہے<br />
              <br />
              ہاتھوں میں قلم رکھنا یا ہاتھ قلم رکھنا
            </p>
            <p className="font-urdu text-sm text-red-600 text-left mt-2 pl-15" dir="rtl">خالد علیگ</p>
          </div>
        </div>



        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors appearance-none bg-white cursor-pointer"
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors appearance-none bg-white cursor-pointer"
              >
                <option value="all">All Months</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>
            </div>
          </div>

          {(searchQuery || selectedYear !== 'all' || selectedMonth !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {paginatedIssues.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600">No issues found matching your criteria</p>
            <p className="text-lg text-gray-500 font-urdu mt-2" dir="rtl">کوئی شمارہ نہیں ملا</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {paginatedIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => onNavigate('issue', issue.id)}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                    <img
                      src={imgUrl(issue.cover_image_url, 500)} loading="lazy"
                      alt={issue.title}
                      className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-xs font-medium mb-1 line-clamp-2">{issue.title}</p>
                      <p className="text-xs opacity-90">{getMonthName(issue.issue_month)} {issue.issue_year}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
