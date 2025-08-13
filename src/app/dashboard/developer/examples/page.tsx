'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const INTEGRATION_EXAMPLES = [
  {
    name: 'Salesforce',
    logo: '☁️',
    description: 'Synchronisiere CeleroPress Kontakte mit Salesforce CRM',
    category: 'CRM',
    code: `// Salesforce Integration mit CeleroPress API
// NPM Package noch nicht verfügbar - verwende direkte API-Calls
const axios = require('axios');
const jsforce = require('jsforce');

// Initialisiere API Client
const api = axios.create({
  baseURL: 'https://www.celeropress.com/api/v1',
  headers: {
    'Authorization': process.env.CELEROPRESS_API_KEY // Ohne 'Bearer' prefix!
  }
});

const sf = new jsforce.Connection({
  loginUrl: 'https://login.salesforce.com',
  instanceUrl: process.env.SF_INSTANCE_URL,
  accessToken: process.env.SF_ACCESS_TOKEN
});

// Funktion zum Sync von CeleroPress zu Salesforce
async function syncContactsToSalesforce() {
  try {
    // Hole alle Kontakte von CeleroPress
    const response = await api.get('/contacts', {
      params: {
        limit: 100,
        tags: ['journalist', 'media']
      }
    });
    const contacts = response.data;

    // Transformiere und erstelle in Salesforce
    const sfContacts = contacts.data.map(contact => ({
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Email: contact.email,
      Title: contact.position,
      Company: contact.company,
      Phone: contact.phone,
      Description: \`Imported from CeleroPress. Tags: \${contact.tags.join(', ')}\`,
      LeadSource: 'CeleroPress API'
    }));

    // Bulk Insert in Salesforce
    const result = await sf.sobject('Contact').create(sfContacts);
    console.log(\`Synced \${result.length} contacts to Salesforce\`);

    return result;
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

// Webhook Handler für Real-time Sync
async function handleCeleroPressWebhook(req, res) {
  const { event, data } = req.body;

  switch(event) {
    case 'contact.created':
      await sf.sobject('Contact').create({
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        ExternalId__c: data.id // Custom field für CeleroPress ID
      });
      break;
      
    case 'contact.updated':
      await sf.sobject('Contact').update({
        Id: await findSalesforceId(data.id),
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email
      });
      break;
      
    case 'contact.deleted':
      await sf.sobject('Contact').delete(
        await findSalesforceId(data.id)
      );
      break;
  }

  res.status(200).json({ success: true });
}

// Registriere Webhook
const webhook = await api.post('/webhooks', {
  url: 'https://your-app.com/webhooks/celeropress',
  events: ['contact.created', 'contact.updated', 'contact.deleted'],
  active: true
});`
  },
  {
    name: 'HubSpot',
    logo: '🟠',
    description: 'Bidirektionale Synchronisation zwischen CeleroPress und HubSpot',
    category: 'Marketing',
    code: `// HubSpot Integration mit CeleroPress API
// NPM Package noch nicht verfügbar - verwende direkte API-Calls
const axios = require('axios');
const hubspot = require('@hubspot/api-client');

// Initialisiere API Client
const api = axios.create({
  baseURL: 'https://www.celeropress.com/api/v1',
  headers: {
    'Authorization': process.env.CELEROPRESS_API_KEY // Ohne 'Bearer' prefix!
  }
});

const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN
});

// Sync Companies von CeleroPress zu HubSpot
async function syncCompaniesToHubSpot() {
  // Hole Media Houses von CeleroPress
  const response = await api.get('/companies', {
    params: {
      type: 'media_house',
      limit: 100
    }
  });
  const companies = response.data;

  const hubspotCompanies = [];

  for (const company of companies.data) {
    const properties = {
      name: company.name,
      domain: company.website?.replace(/^https?:\\/\\//, ''),
      phone: company.phone,
      city: company.address?.city,
      country: company.address?.country,
      industry: 'Media & Publishing',
      // Custom Properties
      media_type: company.mediaType,
      circulation: company.circulation,
      online_visitors_monthly: company.onlineVisitorsMonthly,
      celeropress_id: company.id
    };

    try {
      const apiResponse = await hubspotClient.crm.companies.basicApi.create({
        properties,
        associations: []
      });
      
      hubspotCompanies.push(apiResponse);
      console.log(\`Created company: \${company.name}\`);
    } catch (error) {
      // Update wenn bereits existiert
      if (error.body?.category === 'DUPLICATE_VALUE') {
        const existingCompany = await findCompanyByDomain(company.website);
        await hubspotClient.crm.companies.basicApi.update(
          existingCompany.id,
          { properties }
        );
        console.log(\`Updated company: \${company.name}\`);
      }
    }
  }

  return hubspotCompanies;
}

// Sync Contacts mit Engagement Score
async function syncContactsWithEngagement() {
  const response = await api.get('/contacts', {
    params: {
      includeEngagement: true
    }
  });
  const contacts = response.data;

  for (const contact of contacts.data) {
    const properties = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      company: contact.company,
      jobtitle: contact.position,
      phone: contact.phone,
      // Engagement Metrics als Custom Properties
      pr_expertise: contact.expertise?.join(', '),
      pr_tags: contact.tags?.join(', '),
      engagement_score: calculateEngagementScore(contact),
      last_interaction: contact.lastInteraction,
      celeropress_id: contact.id
    };

    // Create or Update in HubSpot
    await hubspotClient.crm.contacts.basicApi.upsert(
      { email: contact.email },
      { properties }
    );
  }
}

// Real-time Bidirectional Sync mit Webhooks
class BidirectionalSync {
  constructor() {
    this.setupCeleroPressWebhooks();
    this.setupHubSpotWebhooks();
  }

  async setupCeleroPressWebhooks() {
    await api.post('/webhooks', {
      url: 'https://your-app.com/webhooks/celeropress-to-hubspot',
      events: [
        'contact.created',
        'contact.updated',
        'company.created',
        'company.updated'
      ]
    });
  }

  async handleCeleroPressWebhook(event, data) {
    switch(event) {
      case 'contact.created':
      case 'contact.updated':
        await this.syncContactToHubSpot(data);
        break;
      case 'company.created':
      case 'company.updated':
        await this.syncCompanyToHubSpot(data);
        break;
    }
  }

  async handleHubSpotWebhook(event, data) {
    // Sync von HubSpot zu CeleroPress
    if (event.subscriptionType === 'contact.propertyChange') {
      const contact = await this.getHubSpotContact(data.objectId);
      await api.put(
        \`/contacts/\${contact.properties.celeropress_id}\`,
        this.transformHubSpotContact(contact)
      );
    }
  }
}

// Marketing Campaign Integration
async function createTargetedCampaign() {
  // Hole Journalisten aus CeleroPress
  const response = await api.get('/contacts', {
    params: {
      tags: ['journalist', 'tech'],
      expertise: ['AI', 'Software']
    }
  });
  const journalists = response.data;

  // Erstelle HubSpot Liste
  const list = await hubspotClient.crm.lists.create({
    name: 'Tech Journalists - AI Focus',
    filters: [
      {
        propertyName: 'celeropress_id',
        operator: 'IN',
        values: journalists.data.map(j => j.id)
      }
    ]
  });

  // Erstelle Email Campaign
  const campaign = await hubspotClient.marketing.emails.create({
    name: 'AI Product Launch - Press Release',
    subject: 'Exclusive: Revolutionary AI Product Launch',
    listIds: [list.id]
  });

  return campaign;
}`
  },
  {
    name: 'Zapier',
    logo: '⚡',
    description: 'No-Code Automation mit Zapier Integration',
    category: 'Automation',
    code: `// Zapier App Integration für CeleroPress
// Dies würde in der Zapier Developer Platform implementiert

const authentication = {
  type: 'custom',
  test: {
    url: 'https://www.celeropress.com/api/v1/auth/test',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer {{bundle.authData.api_key}}'
    }
  },
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'string',
      helpText: 'Finde deinen API Key unter Dashboard > Admin > API'
    }
  ]
};

// Trigger: Neuer Kontakt erstellt
const newContactTrigger = {
  key: 'new_contact',
  noun: 'Contact',
  display: {
    label: 'New Contact',
    description: 'Triggers when a new contact is created.'
  },
  operation: {
    type: 'hook',
    performSubscribe: async (z, bundle) => {
      const response = await z.request({
        url: 'https://www.celeropress.com/api/v1/webhooks',
        method: 'POST',
        body: {
          url: bundle.targetUrl,
          events: ['contact.created']
        }
      });
      return response.data;
    },
    performUnsubscribe: async (z, bundle) => {
      await z.request({
        url: \`https://www.celeropress.com/api/v1/webhooks/\${bundle.subscribeData.id}\`,
        method: 'DELETE'
      });
    },
    perform: async (z, bundle) => {
      return [bundle.cleanedRequest];
    },
    performList: async (z, bundle) => {
      const response = await z.request({
        url: 'https://www.celeropress.com/api/v1/contacts',
        params: {
          limit: 10,
          sort: 'createdAt:desc'
        }
      });
      return response.data;
    }
  }
};

// Action: Create Contact
const createContactAction = {
  key: 'create_contact',
  noun: 'Contact',
  display: {
    label: 'Create Contact',
    description: 'Creates a new contact in CeleroPress.'
  },
  operation: {
    inputFields: [
      {
        key: 'firstName',
        label: 'First Name',
        required: true
      },
      {
        key: 'lastName',
        label: 'Last Name',
        required: true
      },
      {
        key: 'email',
        label: 'Email',
        required: true
      },
      {
        key: 'company',
        label: 'Company'
      },
      {
        key: 'position',
        label: 'Position'
      },
      {
        key: 'tags',
        label: 'Tags',
        list: true
      }
    ],
    perform: async (z, bundle) => {
      const response = await z.request({
        url: 'https://www.celeropress.com/api/v1/contacts',
        method: 'POST',
        body: bundle.inputData
      });
      return response.data;
    }
  }
};

// Search: Find Contact by Email
const searchContactSearch = {
  key: 'search_contact',
  noun: 'Contact',
  display: {
    label: 'Find Contact',
    description: 'Search for a contact by email.'
  },
  operation: {
    inputFields: [
      {
        key: 'email',
        label: 'Email',
        required: true
      }
    ],
    perform: async (z, bundle) => {
      const response = await z.request({
        url: 'https://www.celeropress.com/api/v1/search',
        method: 'POST',
        body: {
          query: bundle.inputData.email,
          entities: ['contacts']
        }
      });
      return response.data.contacts;
    }
  }
};

// Beispiel Zaps die Nutzer erstellen können:

// 1. Google Sheets → CeleroPress
// Wenn neue Zeile in Google Sheets → Erstelle Kontakt in CeleroPress

// 2. CeleroPress → Slack
// Wenn neuer Journalist-Kontakt → Sende Nachricht in Slack Channel

// 3. Typeform → CeleroPress
// Wenn Formular ausgefüllt → Erstelle Kontakt mit Tags

// 4. CeleroPress → Mailchimp
// Wenn Kontakt mit Tag "newsletter" → Füge zu Mailchimp Liste hinzu

// 5. CeleroPress → Airtable
// Wenn neue Publikation → Erstelle Record in Airtable Base

module.exports = {
  authentication,
  triggers: {
    [newContactTrigger.key]: newContactTrigger
  },
  actions: {
    [createContactAction.key]: createContactAction
  },
  searches: {
    [searchContactSearch.key]: searchContactSearch
  }
};`
  },
  {
    name: 'Webhook Examples',
    logo: '🔔',
    description: 'Beispiele für Custom Webhook Implementierungen',
    category: 'Webhooks',
    code: `// Express.js Webhook Handler für CeleroPress Events
const express = require('express');
const crypto = require('crypto');
// NPM Package noch nicht verfügbar - verwende direkte API-Calls
const axios = require('axios');

const app = express();
app.use(express.json());

const api = axios.create({
  baseURL: 'https://www.celeropress.com/api/v1',
  headers: {
    'Authorization': process.env.CELEROPRESS_API_KEY
  }
});

// Webhook Signature Verification
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Main Webhook Handler
app.post('/webhooks/celeropress', async (req, res) => {
  // Verify signature
  const signature = req.headers['x-celeropress-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data, timestamp } = req.body;
  
  console.log(\`Received event: \${event} at \${timestamp}\`);

  try {
    switch(event) {
      case 'contact.created':
        await handleContactCreated(data);
        break;
        
      case 'contact.updated':
        await handleContactUpdated(data);
        break;
        
      case 'company.created':
        await handleCompanyCreated(data);
        break;
        
      case 'publication.added':
        await handlePublicationAdded(data);
        break;
        
      case 'campaign.completed':
        await handleCampaignCompleted(data);
        break;
        
      case 'webhook.test':
        console.log('Test webhook received successfully');
        break;
        
      default:
        console.log(\`Unhandled event type: \${event}\`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(\`Error processing webhook: \${error}\`);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Event Handlers
async function handleContactCreated(contact) {
  // Sende Willkommens-Email
  await sendWelcomeEmail(contact.email, contact.firstName);
  
  // Füge zu CRM hinzu
  await addToCRM(contact);
  
  // Erstelle Task für Follow-up
  await createFollowUpTask(contact);
  
  // Analytics tracking
  await trackEvent('contact.created', {
    tags: contact.tags,
    source: contact.source
  });
}

async function handleContactUpdated(contact) {
  // Sync mit externen Systemen
  await syncWithExternalSystems(contact);
  
  // Update Search Index
  await updateSearchIndex(contact);
  
  // Prüfe ob wichtige Felder geändert wurden
  if (contact.changes?.includes('email')) {
    await handleEmailChange(contact);
  }
}

async function handleCompanyCreated(company) {
  // Enrichment mit externen Daten
  const enrichedData = await enrichCompanyData(company.website);
  
  // Update in CeleroPress
  await api.put(\`/companies/\${company.id}\`, enrichedData);
  
  // Benachrichtige Sales Team
  await notifySalesTeam(company);
}

async function handlePublicationAdded(publication) {
  // Analysiere Publication für relevante Kontakte
  const relevantContacts = await findRelevantJournalists(publication);
  
  // Erstelle Outreach Campaign
  if (relevantContacts.length > 0) {
    await createOutreachCampaign(publication, relevantContacts);
  }
  
  // Update Media Library Statistics
  await updateMediaStatistics(publication);
}

async function handleCampaignCompleted(campaign) {
  // Generiere Report
  const report = await generateCampaignReport(campaign.id);
  
  // Sende Report an Stakeholder
  await sendReportToStakeholders(report);
  
  // Archive Campaign Data
  await archiveCampaignData(campaign);
  
  // Trigger Follow-up Actions
  if (campaign.metrics.openRate > 0.3) {
    await createFollowUpCampaign(campaign);
  }
}

// Registriere alle Webhooks beim Start
async function registerWebhooks() {
  const webhookUrl = 'https://your-app.com/webhooks/celeropress';
  
  const response = await api.post('/webhooks', {
    url: webhookUrl,
    events: [
      'contact.created',
      'contact.updated',
      'contact.deleted',
      'company.created',
      'company.updated',
      'publication.added',
      'campaign.started',
      'campaign.completed',
      'media_asset.created'
    ],
    active: true,
    secret: process.env.WEBHOOK_SECRET
  });
  const webhook = response.data;
  
  console.log(\`Webhook registered: \${webhook.id}\`);
  return webhook;
}

// Error Recovery und Retry Logic
class WebhookProcessor {
  constructor() {
    this.retryQueue = [];
    this.maxRetries = 3;
  }
  
  async processWithRetry(event, data, retryCount = 0) {
    try {
      await this.process(event, data);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(\`Retrying event \${event} (attempt \${retryCount + 1})\`);
        setTimeout(() => {
          this.processWithRetry(event, data, retryCount + 1);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      } else {
        await this.handleFailedWebhook(event, data, error);
      }
    }
  }
  
  async handleFailedWebhook(event, data, error) {
    // Log to error tracking service
    console.error(\`Webhook processing failed: \${event}\`, error);
    
    // Store for manual review
    await storeFailedWebhook({
      event,
      data,
      error: error.message,
      timestamp: new Date()
    });
    
    // Notify admin
    await notifyAdmin(\`Webhook failed: \${event}\`, error);
  }
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
  registerWebhooks();
});`
  },
  {
    name: 'GraphQL Subscriptions',
    logo: '🔄',
    description: 'Real-time Updates mit GraphQL Subscriptions',
    category: 'Real-time',
    code: `// GraphQL Subscriptions für Real-time Updates
import { ApolloClient, InMemoryCache, split } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { createHttpLink } from '@apollo/client/link/http';

// HTTP Link für Queries und Mutations
const httpLink = createHttpLink({
  uri: 'https://www.celeropress.com/api/v1/graphql',
  headers: {
    authorization: \`Bearer \${process.env.CELEROPRESS_API_KEY}\`
  }
});

// WebSocket Link für Subscriptions
const wsLink = new WebSocketLink({
  uri: 'wss://www.celeropress.com/api/v1/graphql',
  options: {
    reconnect: true,
    connectionParams: {
      authToken: process.env.CELEROPRESS_API_KEY
    }
  }
});

// Split Link basierend auf Operation Type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Apollo Client Setup
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});

// GraphQL Subscriptions
const CONTACT_UPDATES_SUBSCRIPTION = gql\`
  subscription OnContactUpdate($organizationId: ID!) {
    contactUpdate(organizationId: $organizationId) {
      id
      firstName
      lastName
      email
      company
      tags
      lastModified
      modifiedBy {
        id
        name
      }
    }
  }
\`;

const CAMPAIGN_PROGRESS_SUBSCRIPTION = gql\`
  subscription OnCampaignProgress($campaignId: ID!) {
    campaignProgress(campaignId: $campaignId) {
      id
      status
      progress
      metrics {
        sent
        delivered
        opened
        clicked
        bounced
      }
      currentStep
      errors
    }
  }
\`;

const PUBLICATION_ADDED_SUBSCRIPTION = gql\`
  subscription OnPublicationAdded($mediaTypes: [String!]) {
    publicationAdded(mediaTypes: $mediaTypes) {
      id
      name
      type
      circulation
      topics
      addedBy {
        id
        name
      }
      addedAt
    }
  }
\`;

// React Component mit Subscriptions
import { useSubscription } from '@apollo/client';
import { useEffect, useState } from 'react';

function RealTimeDashboard({ organizationId }) {
  const [contacts, setContacts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Subscribe to Contact Updates
  const { data: contactData } = useSubscription(
    CONTACT_UPDATES_SUBSCRIPTION,
    {
      variables: { organizationId },
      onSubscriptionData: ({ subscriptionData }) => {
        const updatedContact = subscriptionData.data.contactUpdate;
        
        // Update local state
        setContacts(prev => {
          const index = prev.findIndex(c => c.id === updatedContact.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = updatedContact;
            return updated;
          }
          return [...prev, updatedContact];
        });
        
        // Show notification
        showNotification(\`Contact updated: \${updatedContact.firstName} \${updatedContact.lastName}\`);
      }
    }
  );

  // Subscribe to Campaign Progress
  const { data: campaignData } = useSubscription(
    CAMPAIGN_PROGRESS_SUBSCRIPTION,
    {
      variables: { campaignId: activeCampaignId },
      skip: !activeCampaignId
    }
  );

  // Subscribe to New Publications
  const { data: publicationData } = useSubscription(
    PUBLICATION_ADDED_SUBSCRIPTION,
    {
      variables: { mediaTypes: ['newspaper', 'magazine', 'online'] }
    }
  );

  return (
    <div>
      <h2>Real-time Updates</h2>
      
      {/* Live Contact Updates */}
      <div className="live-feed">
        {contacts.map(contact => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
      
      {/* Campaign Progress Bar */}
      {campaignData && (
        <CampaignProgress 
          progress={campaignData.campaignProgress} 
        />
      )}
      
      {/* New Publications Alert */}
      {publicationData && (
        <NewPublicationAlert 
          publication={publicationData.publicationAdded} 
        />
      )}
    </div>
  );
}

// Advanced GraphQL Queries mit Fragments
const CONTACT_FRAGMENT = gql\`
  fragment ContactDetails on Contact {
    id
    firstName
    lastName
    email
    company
    position
    tags
    expertise
    socialProfiles {
      platform
      url
    }
  }
\`;

const COMPLEX_SEARCH_QUERY = gql\`
  \${CONTACT_FRAGMENT}
  
  query AdvancedSearch(
    $query: String!
    $filters: SearchFilters
    $pagination: PaginationInput
  ) {
    search(query: $query, filters: $filters, pagination: $pagination) {
      contacts {
        ...ContactDetails
        company {
          id
          name
          type
          mediaHouse {
            publications {
              id
              name
              circulation
            }
          }
        }
        interactions {
          type
          date
          campaign {
            id
            name
          }
        }
      }
      companies {
        id
        name
        contacts {
          ...ContactDetails
        }
      }
      totalCount
      facets {
        tags {
          value
          count
        }
        companies {
          value
          count
        }
      }
    }
  }
\`;

// Batch Operations mit DataLoader Pattern
const BATCH_CONTACT_OPERATION = gql\`
  mutation BatchContactOperation($operations: [ContactOperation!]!) {
    batchContactOperation(operations: $operations) {
      successful {
        id
        ...ContactDetails
      }
      failed {
        input
        error
      }
      stats {
        total
        successful
        failed
      }
    }
  }
\`;

// Optimistic Updates
async function updateContactOptimistically(contact) {
  await client.mutate({
    mutation: UPDATE_CONTACT_MUTATION,
    variables: { id: contact.id, input: contact },
    optimisticResponse: {
      updateContact: {
        __typename: 'Contact',
        ...contact
      }
    },
    update: (cache, { data }) => {
      // Update cache immediately
      cache.modify({
        id: cache.identify(contact),
        fields: {
          ...contact
        }
      });
    }
  });
}`
  }
];

export default function ExamplesPage() {
  const { user, loading } = useAuth();
  const [selectedExample, setSelectedExample] = useState(INTEGRATION_EXAMPLES[0]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link
                href="/dashboard/developer"
                className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück zum Developer Portal
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Code Examples</h1>
                <p className="text-sm text-gray-600">
                  Integration-Beispiele für populäre Plattformen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4">Integrationen</h2>
              <div className="space-y-2">
                {INTEGRATION_EXAMPLES.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedExample(example)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedExample.name === example.name
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'border-2 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{example.logo}</span>
                      <div>
                        <div className="font-medium text-gray-900">{example.name}</div>
                        <div className="text-xs text-gray-500">{example.category}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-medium text-gray-900 mb-3">Weitere Ressourcen</h3>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-blue-600 hover:text-blue-500">
                  → Postman Collection
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-500">
                  → GitHub Repository
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-500">
                  → Video Tutorials
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-500">
                  → Community Forum
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <span className="text-3xl mr-3">{selectedExample.logo}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedExample.name} Integration
                    </h2>
                    <p className="text-gray-600">{selectedExample.description}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Beispiel Code</h3>
                  <button
                    onClick={() => copyToClipboard(selectedExample.code, 0)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {copiedIndex === 0 ? (
                      <>
                        <CheckIcon className="h-4 w-4 mr-1 text-green-500" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                        Code kopieren
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-300">
                    <code>{selectedExample.code}</code>
                  </pre>
                </div>
              </div>

              {/* Quick Start Guide */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Quick Start Guide</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                        1
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        API Key erstellen
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Erstelle einen API Key mit den benötigten Berechtigungen im Admin Dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                        2
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        SDK installieren
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Installiere das CeleroPress SDK für deine Programmiersprache
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                        3
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Integration konfigurieren
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Kopiere den Beispielcode und passe ihn an deine Anforderungen an
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                        4
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Webhooks aktivieren
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Registriere Webhooks für Real-time Updates (optional)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}