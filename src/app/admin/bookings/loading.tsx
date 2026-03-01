export default function BookingsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-32 bg-dark-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-dark-200 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="h-10 w-32 bg-dark-200 rounded-xl animate-pulse" />
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-dark-100 border border-dark-400 p-4">
        <div className="h-10 bg-dark-200 rounded-xl animate-pulse" />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-dark-100 border border-dark-400 p-6">
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-dark-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
