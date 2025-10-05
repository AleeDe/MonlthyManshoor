export default function HomeSkeleton() {
  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-br from-red-50 via-white to-red-50 pt-24 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-pulse">
              <div className="h-8 w-48 bg-gray-200 rounded-full" />
              <div className="h-10 w-3/4 bg-gray-200 rounded-xl" />
              <div className="h-10 w-2/3 bg-gray-200 rounded-xl" />
              <div className="h-5 w-5/6 bg-gray-200 rounded-lg" />
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="h-12 w-44 bg-gray-200 rounded-2xl" />
                <div className="h-12 w-44 bg-gray-200 rounded-2xl" />
              </div>
            </div>
            <div className="animate-pulse">
              <div className="bg-white p-4 rounded-3xl shadow-2xl">
                <div className="w-full h-96 bg-gray-200 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded-xl mx-auto mb-3" />
            <div className="h-5 w-40 bg-gray-200 rounded-xl mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden shadow-lg">
                <div className="w-full h-80 bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-pulse">
            <div className="h-8 w-72 bg-gray-200 rounded-xl mx-auto mb-3" />
            <div className="h-5 w-48 bg-gray-200 rounded-xl mx-auto" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
                <div className="w-full h-32 bg-gray-200 mb-4 rounded-lg" />
                <div className="h-4 w-24 bg-gray-200 rounded-md mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
