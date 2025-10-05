export default function IssueDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-40 bg-gray-200 rounded-lg mb-8 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-2 animate-pulse">
            <div className="bg-white p-6 rounded-3xl shadow-xl">
              <div className="w-full h-96 bg-gray-200 rounded-2xl mb-6" />
              <div className="h-8 w-3/4 bg-gray-200 rounded-xl mb-3" />
              <div className="h-5 w-40 bg-gray-200 rounded-lg mb-6" />
              <div className="h-12 w-full bg-gray-200 rounded-2xl" />
            </div>
          </div>
          <div className="lg:col-span-3 animate-pulse">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="h-12 w-full bg-red-200" />
              <div className="p-4">
                <div className="w-full h-[60vh] bg-gray-200 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8 animate-pulse">
          <div className="h-8 w-56 bg-gray-200 rounded-xl mx-auto mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-28 bg-gray-200 rounded-2xl" />
            <div className="h-28 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
