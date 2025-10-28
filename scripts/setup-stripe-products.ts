/**
 * Stripe Products & Prices Setup Script
 * Erstellt automatisch alle Products und Prices für CeleroPress
 *
 * USAGE:
 * 1. STRIPE_SECRET_KEY in .env.local eintragen
 * 2. Script ausführen: npx tsx scripts/setup-stripe-products.ts
 * 3. Price IDs kopieren und in .env.local eintragen
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ FEHLER: STRIPE_SECRET_KEY nicht in .env.local gefunden');
  console.error('Bitte erst den Secret Key von Stripe Dashboard kopieren und in .env.local eintragen.');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

interface TierConfig {
  name: string;
  description: string;
  priceMonthly: number; // in EUR
  priceYearly: number; // in EUR
  features: string[];
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  STARTER: {
    name: 'Starter',
    description: 'Perfekt für kleine Teams und Einzelunternehmer',
    priceMonthly: 49,
    priceYearly: 490, // 2 Monate gratis
    features: [
      '2.500 Emails pro Monat',
      '1.000 Kontakte',
      '50.000 AI-Wörter',
      '1 Team-Mitglied',
      '5 GB Cloud-Speicher',
      'Email Support',
    ],
  },
  BUSINESS: {
    name: 'Business',
    description: 'Ideal für wachsende Unternehmen',
    priceMonthly: 149,
    priceYearly: 1490, // 2 Monate gratis
    features: [
      '10.000 Emails pro Monat',
      '5.000 Kontakte',
      'Unlimited AI-Wörter',
      '3 Team-Mitglieder',
      '25 GB Cloud-Speicher',
      'Journalisten-Datenbank',
      'Email & Chat Support',
      '1h Video-Onboarding',
    ],
  },
  AGENTUR: {
    name: 'Agentur',
    description: 'Für Agenturen und große Teams',
    priceMonthly: 399,
    priceYearly: 3990, // 2 Monate gratis
    features: [
      '50.000 Emails pro Monat',
      '25.000 Kontakte',
      'Unlimited AI-Wörter',
      '10 Team-Mitglieder',
      '100 GB Cloud-Speicher',
      'Journalisten-Datenbank',
      'Priority Support (Email, Chat, Phone)',
      'Dedicated Onboarding',
      '+20€/Monat pro zusätzlichem User',
    ],
  },
};

async function main() {
  console.log('🚀 CeleroPress Stripe Setup');
  console.log('========================================\n');

  const priceIds: Record<string, { monthly: string; yearly: string }> = {};

  for (const [tier, config] of Object.entries(TIER_CONFIGS)) {
    console.log(`📦 Erstelle Product: ${config.name} (${tier})`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['tier']:'${tier}'`,
    });

    let product: Stripe.Product;

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`   ✓ Product existiert bereits: ${product.id}`);
    } else {
      // Create product
      product = await stripe.products.create({
        name: `CeleroPress ${config.name}`,
        description: config.description,
        metadata: {
          tier,
          app: 'celeropress',
          features: config.features.join(' | '), // Store as metadata string
        },
      });
      console.log(`   ✓ Product erstellt: ${product.id}`);
    }

    // Create monthly price
    console.log(`   💶 Erstelle Monthly Price: €${config.priceMonthly}/Monat`);
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: config.priceMonthly * 100, // EUR to cents
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier,
        billing_interval: 'monthly',
      },
    });
    console.log(`   ✓ Monthly Price: ${monthlyPrice.id}`);

    // Create yearly price
    console.log(`   💶 Erstelle Yearly Price: €${config.priceYearly}/Jahr`);
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: config.priceYearly * 100, // EUR to cents
      recurring: {
        interval: 'year',
      },
      metadata: {
        tier,
        billing_interval: 'yearly',
      },
    });
    console.log(`   ✓ Yearly Price: ${yearlyPrice.id}`);

    priceIds[tier] = {
      monthly: monthlyPrice.id,
      yearly: yearlyPrice.id,
    };

    console.log('');
  }

  console.log('========================================');
  console.log('✅ Alle Products und Prices erstellt!\n');

  // Generate .env output
  const envOutput = generateEnvOutput(priceIds);
  console.log('📋 Kopiere diese Zeilen in deine .env.local:\n');
  console.log(envOutput);

  // Write to file
  const outputPath = path.join(__dirname, 'stripe-price-ids.txt');
  fs.writeFileSync(outputPath, envOutput, 'utf-8');
  console.log(`\n💾 Price IDs wurden auch gespeichert in: ${outputPath}`);

  console.log('\n🎉 Setup abgeschlossen!');
  console.log('\nNächste Schritte:');
  console.log('1. Price IDs in .env.local eintragen');
  console.log('2. Webhook in Stripe Dashboard konfigurieren');
  console.log('3. Webhook Secret in .env.local eintragen');
}

function generateEnvOutput(priceIds: Record<string, { monthly: string; yearly: string }>): string {
  return `# Stripe Price IDs (Generiert: ${new Date().toISOString()})

# STARTER Tier (€49/Monat, €490/Jahr)
STRIPE_PRICE_STARTER_MONTHLY="${priceIds.STARTER.monthly}"
STRIPE_PRICE_STARTER_YEARLY="${priceIds.STARTER.yearly}"

# BUSINESS Tier (€149/Monat, €1.490/Jahr)
STRIPE_PRICE_BUSINESS_MONTHLY="${priceIds.BUSINESS.monthly}"
STRIPE_PRICE_BUSINESS_YEARLY="${priceIds.BUSINESS.yearly}"

# AGENTUR Tier (€399/Monat, €3.990/Jahr)
STRIPE_PRICE_AGENTUR_MONTHLY="${priceIds.AGENTUR.monthly}"
STRIPE_PRICE_AGENTUR_YEARLY="${priceIds.AGENTUR.yearly}"`;
}

// Run
main().catch((error) => {
  console.error('❌ Fehler beim Setup:', error);
  process.exit(1);
});
