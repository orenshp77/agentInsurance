interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export default function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'אין נתונים להצגה',
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-background-card rounded-2xl p-8 text-center text-foreground-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-background-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-primary/20">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-6 py-4 text-right text-sm font-medium text-foreground-muted"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-primary/10 last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-primary/5' : ''
                } transition-all`}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4">
                    {col.render
                      ? col.render(item)
                      : String(item[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
