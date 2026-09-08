import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
  onClick?: () => void
}

interface BreadcrumbsProps {
  crumbs: Crumb[]
  className?: string
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ crumbs, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1 text-sm ${className}`}>
      <Link
        to="/learning-path"
        className="flex items-center gap-1 text-text-muted-light dark:text-text-muted hover:text-accent transition-colors"
      >
        <Home size={15} />
        <span>Accueil</span>
      </Link>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        const content = (
          <span
            className={
              isLast
                ? 'font-semibold text-accent'
                : 'text-text-muted-light dark:text-text-muted hover:text-accent transition-colors'
            }
          >
            {crumb.label}
          </span>
        )
        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-text-muted-light/60 dark:text-text-muted/60" />
            {!isLast && crumb.to ? (
              <Link to={crumb.to} className="hover:text-accent transition-colors">
                {content}
              </Link>
            ) : !isLast && crumb.onClick ? (
              <button onClick={crumb.onClick} className="hover:text-accent transition-colors">
                {content}
              </button>
            ) : (
              content
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs
