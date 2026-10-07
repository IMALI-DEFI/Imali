"""Pure, bounded replenishment decisions. No source or submission permissions."""
from datetime import datetime, timezone, timedelta

def plan(disposed, credited, workable, history, now=None, target=200):
    now = now or datetime.now(timezone.utc)
    debt = max(0, disposed - credited)
    need = max(debt, target - workable, 0)
    base = dict(replacement_debt=debt, workable=workable, needed=need, limit=min(25, need))
    if not need:
        return dict(base, source=None, reason='inventory_satisfied')
    sources = ('grants_gov', 'sam_gov')
    # A retired source must never hold the active discovery rotation in cooldown.
    active_history = {s: history[s] for s in sources if s in history}
    latest = max(active_history.values(), default=None)
    if latest and now - latest < timedelta(hours=1):
        return dict(base, source=None, reason='global_cooldown')
    due = [s for s in sources if s not in history or now-history[s] >= timedelta(hours=6 if s=='sam_gov' else 3)]
    if not due:
        return dict(base, source=None, reason='source_cooldown')
    source = min(due, key=lambda s: history.get(s, datetime.min.replace(tzinfo=timezone.utc)))
    return dict(base, source=source, reason='replacement_debt' if debt else 'low_inventory')
