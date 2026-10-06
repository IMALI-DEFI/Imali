'use strict';

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

module.exports = function publicOpportunityIntake(pool) {
  const router = express.Router();
  const inquiryLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many inquiries. Please try again later.' },
  });

  router.post('/enterprise-inquiry', inquiryLimiter, async (req, res) => {
    const body = req.body || {};
    if (body.website) return res.status(202).json({ success: true });

    const name = clean(body.name, 120);
    const email = clean(body.email, 254).toLowerCase();
    const organization = clean(body.organization, 180);
    const role = clean(body.role, 140);
    const useCase = clean(body.use_case, 220);
    const message = clean(body.message, 4000);
    const consent = body.consent === true;

    if (!name || !organization || !EMAIL_RE.test(email) || !useCase || message.length < 20 || !consent) {
      return res.status(400).json({ success: false, error: 'Please complete the required inquiry fields.' });
    }

    const sourceId = crypto.createHash('sha256')
      .update([email, organization.toLowerCase(), useCase.toLowerCase(), message.toLowerCase()].join('|'))
      .digest('hex');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const description = [
        'Inbound IMALI Enterprise inquiry.',
        role ? 'Requester role: ' + role : null,
        'Use case: ' + useCase,
        'Message: ' + message,
      ].filter(Boolean).join('\n');

      const inserted = await client.query(`
        INSERT INTO developer_opportunities (
          source, source_id, title, company, description, url, score, personal_fit,
          business_value, revenue_path, fulfillment_path, opportunity_type, business_reason,
          demand_confidence, pursuit_status, pursuit_priority, queued_at, contact_url,
          outreach_status, outreach_channel, outreach_contact_email, contact_type,
          eligibility_status, eligibility_reason, eligibility_checked_at,
          target_quality_status, target_quality_reason, target_quality_checked_at,
          execution_verified, execution_verified_at, execution_reason,
          execution_source_verified, execution_source_reason, execution_status,
          automation_status, pipeline_stage
        ) VALUES (
          'inbound_enterprise', $1, 'IMALI Enterprise inbound inquiry', $2, $3,
          'https://imali-defi.com/enterprise', 100, 100, 100, 'direct_outreach', 'direct',
          'commercial_inbound', 'Customer-originated enterprise inquiry', 100, 'queued', 100,
          now(), 'https://imali-defi.com/enterprise', 'not_prepared', 'email', $4,
          'business_contact', 'eligible',
          'Inbound requester initiated contact; no external eligibility prerequisite', now(),
          'verified', 'Requester supplied this reply address in the IMALI Enterprise inquiry form', now(),
          true, now(), 'Inbound customer request provides a verified reply destination',
          true, 'Direct first-party inquiry submitted on imali-defi.com', 'ready', 'pending', 'discovered'
        )
        ON CONFLICT (source, source_id) DO NOTHING
        RETURNING id
      `, [sourceId, organization, description, email]);

      let opportunityId;
      if (inserted.rowCount) {
        opportunityId = inserted.rows[0].id;
        await client.query(`
          INSERT INTO opportunity_operations (
            opportunity_id, operational_state, lane, next_machine_action, next_retry_at,
            evidence, automation_level, automation_reason, automation_confidence,
            automation_classified_at, updated_at
          ) VALUES (
            $1, 'AUTO_PROCESSING', 'Commercial', 'outreach_preparation', now(),
            jsonb_build_object(
              'source','imali_enterprise_form',
              'requester_name',$2::text,
              'requester_role',$3::text,
              'use_case',$4::text,
              'consent',true,
              'received_at',now()
            ),
            'autonomous_eligible',
            'First-party inbound inquiry has a verified reply destination and no known human prerequisite',
            1.0, now(), now()
          )
          ON CONFLICT (opportunity_id) DO NOTHING
        `, [opportunityId, name, role || null, useCase]);
      } else {
        const existing = await client.query(
          "SELECT id FROM developer_opportunities WHERE source='inbound_enterprise' AND source_id=$1 LIMIT 1",
          [sourceId]
        );
        opportunityId = existing.rows[0]?.id;
      }

      await client.query('COMMIT');
      return res.status(inserted.rowCount ? 201 : 200).json({
        success: true,
        opportunity_id: opportunityId,
        status: inserted.rowCount ? 'created' : 'already_received',
        message: 'Thanks — your inquiry was received.',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Enterprise inquiry intake error:', error.message);
      return res.status(500).json({ success: false, error: 'Unable to save your inquiry right now.' });
    } finally {
      client.release();
    }
  });

  return router;
};
