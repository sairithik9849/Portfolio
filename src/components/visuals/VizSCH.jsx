const PERMS = [
  ['read.assignments',  true],
  ['grade.submissions', true],
  ['edit.rubric',       true],
  ['publish.course',    false],
  ['manage.users',      false],
  ['view.analytics',    true],
]

export default function VizSCH() {
  return (
    <div className="viz-sch">
      <div>
        <div className="roles">
          <div className="role">STUDENT</div>
          <div className="role active">TA · ACTIVE</div>
          <div className="role">ADMIN</div>
        </div>
        <div className="perms">
          {PERMS.map(([label, allowed]) => (
            <>
              <span key={label}>{label}</span>
              <span key={`${label}-v`} className={allowed ? 'y' : 'n'}>{allowed ? '✓' : '✗'}</span>
            </>
          ))}
        </div>
      </div>
      <div style={{ alignSelf: 'end', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.14em' }}>
        // RBAC RESOLVED · jwt:scopes[6]
      </div>
    </div>
  )
}
