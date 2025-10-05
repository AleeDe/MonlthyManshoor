export default function ArchiveSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-pulse">
          <div className="h-10 w-72 bg-gray-200 rounded-xl mx-auto mb-3" />
          <div className="h-6 w-44 bg-gray-200 rounded-xl mx-auto" />
          <div className="h-5 w-80 bg-gray-200 rounded-xl mx-auto mt-4" />
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 animate-pulse">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden shadow-lg">
              <div className="w-full h-64 bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
