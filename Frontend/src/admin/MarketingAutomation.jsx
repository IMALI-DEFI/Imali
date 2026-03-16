def get_jobs(self):
    """Get all automation jobs with status"""
    jobs_list = []
    for job_id, job in self.jobs.items():
        try:
            jobs_list.append({
                'id': job_id,
                'name': job.get('name', 'Unnamed Job'),
                'description': job.get('description', ''),
                'icon': self._get_job_icon(job_id),
                'schedule': job.get('schedule', '0 9 * * *'),
                'status': job.get('status', 'active'),
                'last_run': job.get('last_run'),
                'next_run': self._calculate_next_run(job.get('schedule')) if job.get('status') == 'active' else None,
                'channels': job.get('channels', []),
                'stats': job.get('stats', {}),
                'messages': self.templates.get(job_id, {})  # ← ADD THIS LINE
            })
        except Exception as e:
            print(f"Error processing job {job_id}: {e}")
    
    return {
        'jobs': jobs_list,
        'stats': {
            'total_posts': sum(j.get('stats', {}).get('posts', 0) + j.get('stats', {}).get('messages', 0) for j in self.jobs.values()),
            'total_emails': sum(j.get('stats', {}).get('sent', 0) + j.get('stats', {}).get('welcomed', 0) for j in self.jobs.values()),
            'conversion_rate': 2.5,
            'active_jobs': sum(1 for j in self.jobs.values() if j.get('status') == 'active'),
            'pending': 0
        }
    }
