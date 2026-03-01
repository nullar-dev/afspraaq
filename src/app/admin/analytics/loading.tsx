export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-32 bg-dark-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-dark-200 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="h-10 w-36 bg-dark-200 rounded-xl animate-pulse" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-dark-100 border border-dark-400 p-6 h-32 animate-pulse"
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-dark-100 border border-dark-400 p-6 h-96 animate-pulse" />
        <div className="rounded-2xl bg-dark-100 border border-dark-400 p-6 h-96 animate-pulse" />
      </div>
    </div>
  );
}
