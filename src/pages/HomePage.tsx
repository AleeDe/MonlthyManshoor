import { useEffect, useState } from 'react';
import { BookOpen, Library, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { MagazineIssue, SisterMagazine } from '../lib/database.types';
import HomeSkeleton from '../components/HomeSkeleton';

interface HomePageProps {
  onNavigate: (page: string, issueId?: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [latestIssue, setLatestIssue] = useState<MagazineIssue | null>(null);
  const [featuredIssues, setFeaturedIssues] = useState<MagazineIssue[]>([]);
  const [sisterMagazines, setSisterMagazines] = useState<SisterMagazine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [latestResponse, featuredResponse, sistersResponse] = await Promise.all([
        supabase
          .from('magazine_issues')
          .select('*')
          .order('publish_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('magazine_issues')
          .select('*')
          .eq('featured', true)
          .order('publish_date', { ascending: false })
          .limit(4),
        supabase
          .from('sister_magazines')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true })
      ]);

      if (latestResponse.data) setLatestIssue(latestResponse.data);
      if (featuredResponse.data) setFeaturedIssues(featuredResponse.data);
      if (sistersResponse.data) setSisterMagazines(sistersResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  if (loading) return <HomeSkeleton />;

  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-br from-red-50 via-white to-red-50 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                <Sparkles className="w-4 h-4" /> Since 1964 • Archives
              </div>

              <p className="text-2xl md:text-3xl font-semibold text-gray-900 leading-relaxed">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-700">Manshoor Archives,</span> Started publishing in 1964 under the leadership of Comrade Tufail Abbas. The living history of Pakistan’s Left, surviving bans and forced closures for over five decades.
              </p>

              <p className="font-urdu text-xl sm:text-2xl md:text-3xl text-gray-900 leading-relaxed" dir="rtl">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-700">اوراقِ منشور</span> کامریڈ طفیل عباس کی قیادت میں 1964 میں اشاعت کا آغاز۔ نصف صدی سے زائد فکری و عوامی مزاحمت کی زندہ داستان، جو پابندیوں کے باوجود جاری رہی۔
              </p>

              <div className="h-1 w-24 bg-gradient-to-r from-red-600 to-red-500 rounded-full"></div>

              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  onClick={() => latestIssue && onNavigate('issue', latestIssue.id)}
                  className="group bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-2xl font-semibold flex items-center gap-2 hover:shadow-2xl hover:shadow-red-600/40 transition-all duration-300 hover:scale-105"
                >
                  <BookOpen className="w-5 h-5" />
                  Read Latest Issue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => onNavigate('archive')}
                  className="group bg-white text-gray-900 px-8 py-4 rounded-2xl font-semibold flex items-center gap-2 border-2 border-gray-200 hover:border-red-600 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Library className="w-5 h-5" />
                  Explore Archive
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {latestIssue && (
              <div className="relative group animate-slide-in">
                <div className="absolute -inset-4 bg-gradient-to-r from-red-600 to-red-700 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                <div className="relative bg-white p-4 rounded-3xl shadow-2xl">
                  <img
                    src={latestIssue.cover_image_url}
                    alt={latestIssue.title}
                    className="w-full h-auto rounded-2xl shadow-lg"
                  />
                  <div className="absolute -bottom-6 -right-6 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl">
                    <p className="text-sm font-medium">Latest Issue</p>
                    <p className="text-xs">{getMonthName(latestIssue.issue_month)} {latestIssue.issue_year}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {featuredIssues.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Issues</h2>
              <p className="text-xl text-gray-600 font-urdu" dir="rtl">منتخب شمارے</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="group cursor-pointer"
                  onClick={() => onNavigate('issue', issue.id)}
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                    <img
                      src={issue.cover_image_url}
                      alt={issue.title}
                      className="w-full h-80 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-sm font-medium mb-1">{issue.title}</p>
                      <p className="text-xs opacity-90">{getMonthName(issue.issue_month)} {issue.issue_year}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">About Our Archive</h2>
          <p className="text-xl text-gray-600 font-urdu mb-8" dir="rtl">ہمارے آرکائیو کے بارے میں</p>

          <div className="bg-white p-8 rounded-3xl shadow-xl">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              For 45 years, our magazine has been a beacon of Urdu literature and cultural preservation. This digital archive represents decades of thoughtful articles, creative works, and cultural commentary that have shaped generations of readers.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed font-urdu" dir="rtl">
              45 سالوں سے، ہمارا میگزین اردو ادب اور ثقافتی تحفظ کا مینار رہا ہے۔ یہ ڈیجیٹل آرکائیو کئی دہائیوں کے سوچے سمجھے مضامین، تخلیقی کاموں اور ثقافتی تبصروں کی نمائندگی کرتا ہے جنہوں نے قارئین کی نسلوں کو تشکیل دیا ہے۔
            </p>
          </div>
        </div>
      </section>

      {sisterMagazines.length > 0 && (
        <section className="relative py-28 bg-gradient-to-b from-white via-red-50/40 to-white overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 bg-red-200/30 rounded-full blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 bg-red-300/20 rounded-full blur-3xl"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm mb-4">
                <Sparkles className="w-4 h-4" /> Sister Websites
              </div>
              <h2 className="text-5xl font-bold text-gray-900 mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-700">Sister Publications</span>
              </h2>
              <p className="text-2xl sm:text-3xl text-gray-600 font-urdu" dir="rtl">ہمارے دیگر اشاعتیں</p>
              <div className="h-1.5 w-32 bg-gradient-to-r from-red-600 to-red-500 rounded-full mx-auto mt-8"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {sisterMagazines.map((magazine) => (
                <a
                  key={magazine.id}
                  href={magazine.website_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative bg-white/80 backdrop-blur p-8 rounded-3xl shadow-2xl hover:shadow-[0_20px_50px_-10px_rgba(239,68,68,0.35)] transition-all duration-300 hover:-translate-y-2 border-2 border-red-100 hover:border-red-300 ring-1 ring-transparent hover:ring-red-200"
                >
                  <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-red-600/0 via-red-500/0 to-red-400/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity"></div>
                  <div className="relative">
                    <div className="h-44 flex items-center justify-center">
                      <img
                        src={magazine.logo_url}
                        alt={magazine.name}
                        className="max-h-40 w-auto object-contain"
                      />
                    </div>
                    <h3 className="text-center text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors mt-5">
                      {magazine.name}
                    </h3>
                    <div className="mt-4 flex items-center justify-center text-red-600 font-semibold gap-1">
                      <span className="text-base">Visit site</span>
                      <ExternalLink className="w-5 h-5" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
