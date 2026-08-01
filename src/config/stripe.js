// src/config/stripe.js
// Stripe configuration for IMALI platform

// Get price IDs from environment variables
const STRIPE_CONFIG = {
    // ==============================================
    // TRADING PLATFORM PRICE IDs
    // ==============================================
    STARTER_PRICE_ID: process.env.STRIPE_PRICE_STARTER || 'price_1RmmEbG8grx7xEaapklgSZAw',
    PRO_PRICE_ID: process.env.STRIPE_PRICE_PRO || 'price_1RmmGYG8grx7xEaaqyRXzeBE',
    ELITE_PRICE_ID: process.env.STRIPE_PRICE_ELITE || 'price_1RmmNtG8grx7xEaasmCAMpnN',
    STOCK_PRICE_ID: process.env.STRIPE_PRICE_STOCK || 'price_T2W4B9t5z3uzjE',
    BUNDLE_PRICE_ID: process.env.STRIPE_PRICE_BUNDLE || 'price_T2W6d6sUA0TIvs',
    IMALI_BUNDLE_PRICE_ID: process.env.STRIPE_PRICE_IMALI_BUNDLE || 'price_1Rw2UHG8grx7xEaaE3Frmwky',
    
    // ==============================================
    // ADMIN PLATFORM PRICE IDs
    // ==============================================
    ADMIN_PROFESSIONAL_PRICE_ID: process.env.STRIPE_PRICE_ADMIN_PRO || 'price_1TqbISG8grx7xEaaJOwGKmCt',
    ADMIN_BUSINESS_PRICE_ID: process.env.STRIPE_PRICE_ADMIN_BUSINESS || 'price_1TqbNbG8grx7xEaazG9OHxfy',
    
    // ==============================================
    // HELPER FUNCTIONS
    // ==============================================
    
    /**
     * Get the Stripe Price ID for a given tier and product type
     * @param {string} tier - The plan tier (pro, elite, professional, business, etc.)
     * @param {string} productType - The product type (trading, admin)
     * @returns {string} The Stripe Price ID
     */
    getPriceIdForTier: (tier, productType = 'trading') => {
      if (productType === 'admin') {
        const adminPriceMap = {
          'professional': process.env.STRIPE_PRICE_ADMIN_PRO || 'price_1TqbISG8grx7xEaaJOwGKmCt',
          'business': process.env.STRIPE_PRICE_ADMIN_BUSINESS || 'price_1TqbNbG8grx7xEaazG9OHxfy',
          // Enterprise doesn't have a price ID - it's custom
        };
        return adminPriceMap[tier] || adminPriceMap['professional'];
      }
      
      // Trading platform
      const tradingPriceMap = {
        'starter': process.env.STRIPE_PRICE_STARTER || 'price_1RmmEbG8grx7xEaapklgSZAw',
        'pro': process.env.STRIPE_PRICE_PRO || 'price_1RmmGYG8grx7xEaaqyRXzeBE',
        'elite': process.env.STRIPE_PRICE_ELITE || 'price_1RmmNtG8grx7xEaasmCAMpnN',
        'stock': process.env.STRIPE_PRICE_STOCK || 'price_T2W4B9t5z3uzjE',
        'bundle': process.env.STRIPE_PRICE_BUNDLE || 'price_T2W6d6sUA0TIvs',
        'imali_bundle': process.env.STRIPE_PRICE_IMALI_BUNDLE || 'price_1Rw2UHG8grx7xEaaE3Frmwky',
      };
      return tradingPriceMap[tier] || tradingPriceMap['starter'];
    },
    
    /**
     * Get the display name for a plan
     * @param {string} tier - The plan tier
     * @param {string} productType - The product type
     * @returns {string} The display name
     */
    getPlanDisplayName: (tier, productType = 'trading') => {
      if (productType === 'admin') {
        const adminNames = {
          'professional': 'Professional',
          'business': 'Business',
        };
        return adminNames[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
      }
      
      const tradingNames = {
        'starter': 'Starter',
        'pro': 'Pro',
        'elite': 'Elite',
        'stock': 'Stock Trading',
        'bundle': 'Complete Bundle',
        'imali_bundle': 'IMALI Premium Bundle',
      };
      return tradingNames[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
    },
    
    /**
     * Get the price amount for a plan (for display purposes)
     * @param {string} tier - The plan tier
     * @param {string} productType - The product type
     * @returns {number|string} The price amount or 'Custom'
     */
    getPlanPrice: (tier, productType = 'trading') => {
      if (productType === 'admin') {
        const adminPrices = {
          'professional': 49,
          'business': 99,
        };
        return adminPrices[tier] || adminPrices['professional'];
      }
      
      const tradingPrices = {
        'starter': 0,
        'pro': 19,
        'elite': 49,
        'stock': 29,
        'bundle': 59,
        'imali_bundle': 79,
      };
      return tradingPrices[tier] || tradingPrices['starter'];
    },
  };
  
  export default STRIPE_CONFIG;
  
  // ==============================================
  // EXPORT HELPER FUNCTIONS FOR CONVENIENCE
  // ==============================================
  
  export const getPriceIdForTier = STRIPE_CONFIG.getPriceIdForTier;
  export const getPlanDisplayName = STRIPE_CONFIG.getPlanDisplayName;
  export const getPlanPrice = STRIPE_CONFIG.getPlanPrice;