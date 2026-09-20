BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS opportunity_operations (
 opportunity_id integer PRIMARY KEY REFERENCES developer_opportunities(id),
 operational_state text NOT NULL CHECK (operational_state IN ('AUTO_PROCESSING','ACTION_REQUIRED','BLOCKED_EXTERNAL','DISPOSED','COMPLETED')),
 lane text NOT NULL, next_machine_action text, next_human_action text,
 blocker_type text, blocker_reason text, next_retry_at timestamptz, final_approval_type text,
 workbench_stage text, provider_stage text, completion_type text,
 disposition_reason text, disposition_evidence jsonb, disposed_at timestamptz, disposed_by text,
 previous_state jsonb, evidence jsonb NOT NULL DEFAULT '{}',
 approval_status text, approved_at timestamptz, approved_by text,
 restored_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (operational_state <> 'AUTO_PROCESSING' OR next_machine_action IS NOT NULL),
 CHECK (operational_state <> 'ACTION_REQUIRED' OR next_human_action IS NOT NULL),
 CHECK (operational_state <> 'BLOCKED_EXTERNAL' OR blocker_type IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS opportunity_operations_dispatch ON opportunity_operations(operational_state,next_retry_at,next_machine_action);
CREATE TABLE IF NOT EXISTS opportunity_transitions (
 id bigserial PRIMARY KEY, opportunity_id integer NOT NULL REFERENCES developer_opportunities(id),
 from_state jsonb, to_state jsonb NOT NULL, reason text NOT NULL, engine text NOT NULL,
 actor text NOT NULL DEFAULT 'system', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS opportunity_engine_attempts (
 opportunity_id integer NOT NULL REFERENCES developer_opportunities(id), action text NOT NULL,
 attempts integer NOT NULL DEFAULT 0, result text, reason text, evidence jsonb DEFAULT '{}',
 last_attempt_at timestamptz, next_retry_at timestamptz,
 PRIMARY KEY(opportunity_id,action)
);
CREATE TABLE IF NOT EXISTS opportunity_cycle_runs (
 id bigserial PRIMARY KEY, lane text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz, runtime_seconds numeric, result text NOT NULL DEFAULT 'running',
 guard_status text NOT NULL DEFAULT 'passed', stages jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS opportunity_research (
 opportunity_id integer PRIMARY KEY REFERENCES developer_opportunities(id),
 official_url text, official_verified boolean NOT NULL DEFAULT false,
 documents jsonb NOT NULL DEFAULT '[]', requirements jsonb NOT NULL DEFAULT '{}',
 scope_retrieved boolean NOT NULL DEFAULT false, eligibility_verified boolean NOT NULL DEFAULT false,
 eligibility_evidence jsonb NOT NULL DEFAULT '{}', package_path text, verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS opportunity_provider_candidates (
 id bigserial PRIMARY KEY, opportunity_id integer NOT NULL REFERENCES developer_opportunities(id),
 source_table text NOT NULL, source_id integer NOT NULL, name text NOT NULL, website text,
 evidence jsonb NOT NULL DEFAULT '{}', verification_status text NOT NULL DEFAULT 'unverified',
 economics jsonb NOT NULL DEFAULT '{}', decision text, decided_by text, decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(opportunity_id,source_table,source_id)
);
CREATE OR REPLACE FUNCTION audit_opportunity_operation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR (to_jsonb(OLD)-'updated_at') IS DISTINCT FROM (to_jsonb(NEW)-'updated_at') THEN
 INSERT INTO opportunity_transitions(opportunity_id,from_state,to_state,reason,engine,actor)
 VALUES(NEW.opportunity_id,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),
 COALESCE(NULLIF(current_setting('imali.reason',true),''),NEW.blocker_reason,NEW.next_machine_action,NEW.next_human_action,NEW.disposition_reason,NEW.completion_type,'Reconcile canonical state'),
 COALESCE(NULLIF(current_setting('imali.engine',true),''),'canonical_classifier'),
 COALESCE(NULLIF(current_setting('imali.actor',true),''),'system'));
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS opportunity_operation_audit ON opportunity_operations;
CREATE TRIGGER opportunity_operation_audit AFTER INSERT OR UPDATE ON opportunity_operations FOR EACH ROW EXECUTE FUNCTION audit_opportunity_operation();
GRANT SELECT,INSERT,UPDATE ON opportunity_operations, opportunity_transitions, opportunity_engine_attempts, opportunity_cycle_runs, opportunity_research, opportunity_provider_candidates TO sniperuser;
GRANT USAGE,SELECT ON SEQUENCE opportunity_transitions_id_seq,opportunity_cycle_runs_id_seq,opportunity_provider_candidates_id_seq TO sniperuser;
COMMIT;
BEGIN;
CREATE OR REPLACE FUNCTION audit_opportunity_detail() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_state jsonb; new_state jsonb;
BEGIN
 old_state=jsonb_build_object('status',OLD.status,'pursuit_status',OLD.pursuit_status,'application_status',OLD.application_status,'outreach_status',OLD.outreach_status,'execution_status',OLD.execution_status,'revenue_path',OLD.revenue_path,'procurement_status',OLD.procurement_status,'scope_status',OLD.scope_status,'automation_status',OLD.automation_status,'actual_revenue',OLD.actual_revenue);
 new_state=jsonb_build_object('status',NEW.status,'pursuit_status',NEW.pursuit_status,'application_status',NEW.application_status,'outreach_status',NEW.outreach_status,'execution_status',NEW.execution_status,'revenue_path',NEW.revenue_path,'procurement_status',NEW.procurement_status,'scope_status',NEW.scope_status,'automation_status',NEW.automation_status,'actual_revenue',NEW.actual_revenue);
 IF old_state IS DISTINCT FROM new_state THEN
 INSERT INTO opportunity_transitions(opportunity_id,from_state,to_state,reason,engine,actor) VALUES(NEW.id,old_state,new_state,COALESCE(NULLIF(current_setting('imali.reason',true),''),'Detailed preparation state changed'),COALESCE(NULLIF(current_setting('imali.engine',true),''),'existing_engine'),COALESCE(NULLIF(current_setting('imali.actor',true),''),'system'));
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS opportunity_detail_audit ON developer_opportunities;
CREATE TRIGGER opportunity_detail_audit AFTER UPDATE ON developer_opportunities FOR EACH ROW EXECUTE FUNCTION audit_opportunity_detail();
COMMIT;
-- Preserve and expose existing contractor evidence without selecting or hiring anyone.
INSERT INTO opportunity_provider_candidates(opportunity_id,source_table,source_id,name,website,evidence,verification_status,economics)
SELECT oc.opportunity_id,'service_contractors',s.id,s.company,s.website,
 jsonb_build_object('existing_match_id',oc.id,'match_score',oc.match_score,'service_match',oc.service_match,'geography_match',oc.geography_match,'insurance_match',oc.insurance_match,'license_match',oc.license_match,'capacity_match',oc.capacity_match,'source_verification',s.verification_status,'source',s.service_verification_source),
 'unverified',jsonb_build_object('actual_quote',NULL,'margin_verified',false)
FROM opportunity_contractors oc JOIN service_contractors s ON s.id=oc.contractor_id
WHERE COALESCE(s.email,'') NOT ILIKE '%@example.%' AND COALESCE(s.website,'') NOT ILIKE '%example.com%'
ON CONFLICT(opportunity_id,source_table,source_id) DO NOTHING;
