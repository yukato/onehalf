export function ModuleListSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-6" />
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="h-10 bg-gray-100 rounded w-64 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded flex-1" />
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-6 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
