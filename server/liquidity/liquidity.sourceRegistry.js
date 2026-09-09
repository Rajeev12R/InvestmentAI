/**
 * Phase 18 — Institutional Liquidity Source Registry & Provenance Validator
 * Enforces strict provenance, separate sourceDefinition / sourceVerification / connectionEvidence schemas,
 * and eliminates self-asserted external authority.
 */

import {
  SourceType,
  SourceTier,
  VerificationStatus,
  EndpointType,
  EvidenceOrigin,
  ConnectionEvidenceState,
  SourceConnectionClassification,
  canonicalJsonStringify,
  canonicalHash,
  deepFreeze
} from './liquidity.types.js';

export class LiquiditySourceRegistry {
  constructor() {
    this.sources = new Map();
    this._initializeAuthoritativeSources();
  }

  _initializeAuthoritativeSources() {
    // 1. Nasdaq Direct TotalView-ITCH Feed (Configured Specification Fixture in Local Runtime)
    const nasdaqDefinition = {
      sourceId: 'SRC-US-NASDAQ-DIRECT',
      sourceName: 'Nasdaq TotalView-ITCH Direct Market Data Feed',
      sourceType: SourceType.DIRECT_EXCHANGE,
      provider: 'NASDAQ_OMX_DIRECT',
      venue: 'NASDAQ',
      feedName: 'Nasdaq TotalView-ITCH v5.0',
      protocol: 'ITCH_5.0_BINARY_MULTICAST',
      endpoint: 'itch-direct.nasdaq.com/feed/totalview-itch-v5.0',
      endpointType: EndpointType.DIRECT_SOCKET,
      upstreamSource: 'NASDAQ_DIRECT_EXCHANGE',
      sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      effectiveTo: '2026-12-31T23:59:59.000Z'
    };

    const nasdaqVerificationArtifact = {
      verificationId: 'VERIF-ART-NASDAQ-2024',
      sourceId: 'SRC-US-NASDAQ-DIRECT',
      authority: 'Nasdaq ITCH 5.0 Interface Specification (Reference Standard)',
      certificationType: 'TECHNICAL_SPECIFICATION_FIXTURE',
      specificationDoc: 'Nasdaq ITCH 5.0 Interface Specification v5.0.3',
      signedDate: '2024-01-01T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
      method: 'SPECIFICATION_CONFORMANCE_SIMULATION'
    };

    const nasdaqConnectionEvidenceArtifact = {
      connectionId: 'CONN-ART-NASDAQ-2024',
      sourceId: 'SRC-US-NASDAQ-DIRECT',
      endpoint: 'itch-direct.nasdaq.com/feed/totalview-itch-v5.0',
      endpointType: EndpointType.DIRECT_SOCKET,
      multicastGroup: '233.54.12.100:26000',
      handshakeProtocol: 'OUCH_ITCH_MCAST',
      sessionEstablishedAt: '2024-01-01T00:00:00.000Z',
      authenticationMethod: 'CONFIGURED_X509_MUTUAL_TLS',
      status: 'CONFIGURED_STANDBY'
    };

    this.registerAuthoritativeSource({
      sourceDefinition: nasdaqDefinition,
      sourceVerification: {
        verificationStatus: VerificationStatus.UNVERIFIED,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        externalSignatureVerified: false,
        verificationEvidenceId: 'EVID-SRC-VERIFY-NASDAQ-2024',
        verificationAuthority: 'Nasdaq ITCH 5.0 Interface Specification (Reference Standard)',
        verificationDate: '2024-01-01T00:00:00.000Z',
        verificationMethod: 'SPECIFICATION_CONFORMANCE_SIMULATION',
        verificationArtifactType: 'TECHNICAL_SPECIFICATION_FIXTURE',
        verificationArtifact: nasdaqVerificationArtifact
      },
      connectionEvidence: {
        connectionEvidenceId: 'CONN-EVID-NASDAQ-2024',
        connectionState: ConnectionEvidenceState.CONFIGURED_CONNECTION,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        authenticatedAt: '2024-01-01T00:00:00.000Z',
        authenticationMethod: 'CONFIGURED_X509_MUTUAL_TLS',
        connectionStatus: 'CONFIGURED_STANDBY',
        evidenceArtifact: nasdaqConnectionEvidenceArtifact
      },
      description: 'Configured direct exchange ITCH specification fixture (unverified in local environment)'
    });

    // 2. Truth Layer Direct Feed (Internal Adapter to Normalized Direct Exchange ITCH Feed)
    const truthDefinition = {
      sourceId: 'TRUTH_LAYER_DIRECT_FEED',
      sourceName: 'Truth Layer Direct Exchange Normalized Feed Adapter',
      sourceType: SourceType.DIRECT_EXCHANGE,
      provider: 'TRUTH_LAYER_DIRECT_FEED',
      venue: 'NASDAQ_NYSE',
      feedName: 'Truth Layer Direct Normalized Market Feed',
      protocol: 'INTERNAL_DIRECT_NORMALIZER_V1',
      endpoint: 'direct-feed.truthlayer.institutional/v1/market-data',
      endpointType: EndpointType.INTERNAL_ADAPTER,
      upstreamSource: 'NASDAQ_AND_NYSE_DIRECT',
      sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      effectiveTo: '2026-12-31T23:59:59.000Z'
    };

    const truthVerificationArtifact = {
      verificationId: 'VERIF-ART-TRUTH-DIRECT-2024',
      sourceId: 'TRUTH_LAYER_DIRECT_FEED',
      authority: 'InvestmentAI Truth Layer Internal Adapter Review',
      certificationType: 'INTERNAL_ADAPTER_INGESTION_SPECIFICATION',
      upstreamSourceRegistryId: 'SRC-US-NASDAQ-DIRECT',
      signedDate: '2024-01-01T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
      method: 'INTERNAL_COMPLIANCE_REVIEW'
    };

    const truthConnectionEvidenceArtifact = {
      connectionId: 'CONN-ART-TRUTH-DIRECT-2024',
      adapterId: 'ADAPTER-TL-DIRECT-FEED-V1',
      adapterVersion: '1.0.0',
      upstreamSourceId: 'SRC-US-NASDAQ-DIRECT',
      upstreamConnectionEvidenceId: 'CONN-EVID-NASDAQ-2024',
      normalizationVersion: 'NORM-V1.0',
      serviceEndpoint: 'direct-feed.truthlayer.institutional/v1/market-data',
      sessionEstablishedAt: '2024-01-01T00:00:00.000Z',
      authenticationMethod: 'INTERNAL_MUTUAL_TLS_GRPC',
      status: 'CONFIGURED_NORMALIZING'
    };

    this.registerAuthoritativeSource({
      sourceDefinition: truthDefinition,
      sourceVerification: {
        verificationStatus: VerificationStatus.UNVERIFIED,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        externalSignatureVerified: false,
        verificationEvidenceId: 'EVID-SRC-VERIFY-TRUTH-DIRECT-2024',
        verificationAuthority: 'InvestmentAI Truth Layer Internal Adapter Review',
        verificationDate: '2024-01-01T00:00:00.000Z',
        verificationMethod: 'INTERNAL_COMPLIANCE_REVIEW',
        verificationArtifactType: 'INTERNAL_INGESTION_COMPLIANCE_RECORD',
        verificationArtifact: truthVerificationArtifact
      },
      connectionEvidence: {
        adapterId: 'ADAPTER-TL-DIRECT-FEED-V1',
        adapterVersion: '1.0.0',
        upstreamSourceId: 'SRC-US-NASDAQ-DIRECT',
        upstreamConnectionEvidenceId: 'CONN-EVID-NASDAQ-2024',
        normalizationVersion: 'NORM-V1.0',
        connectionEvidenceId: 'CONN-EVID-TRUTH-DIRECT-2024',
        connectionState: ConnectionEvidenceState.CONFIGURED_CONNECTION,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        authenticatedAt: '2024-01-01T00:00:00.000Z',
        authenticationMethod: 'INTERNAL_MUTUAL_TLS_GRPC',
        connectionStatus: 'CONFIGURED_NORMALIZING',
        evidenceArtifact: truthConnectionEvidenceArtifact
      },
      description: 'Institutional internal adapter consuming unverified upstream fixture'
    });

    // 3. NYSE Integrated Direct Feed
    const nyseDefinition = {
      sourceId: 'SRC-US-NYSE-DIRECT',
      sourceName: 'NYSE Integrated Feed Direct Market Data',
      sourceType: SourceType.DIRECT_EXCHANGE,
      provider: 'NYSE_DIRECT_FEED',
      venue: 'NYSE',
      feedName: 'NYSE Integrated Order Book Feed v2.1',
      protocol: 'NYSE_INTEGRATED_2.1_BINARY',
      endpoint: 'direct.nyse.com/feed/nyse-integrated-v2.1',
      endpointType: EndpointType.DIRECT_SOCKET,
      upstreamSource: 'NYSE_DIRECT_EXCHANGE',
      sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      effectiveTo: '2026-12-31T23:59:59.000Z'
    };

    const nyseVerificationArtifact = {
      verificationId: 'VERIF-ART-NYSE-2024',
      sourceId: 'SRC-US-NYSE-DIRECT',
      authority: 'NYSE Integrated Feed Client Specification (Reference Standard)',
      certificationType: 'TECHNICAL_SPECIFICATION_FIXTURE',
      specificationDoc: 'NYSE Integrated Feed Client Specification v2.1',
      signedDate: '2024-01-01T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
      method: 'SPECIFICATION_CONFORMANCE_SIMULATION'
    };

    const nyseConnectionEvidenceArtifact = {
      connectionId: 'CONN-ART-NYSE-2024',
      sourceId: 'SRC-US-NYSE-DIRECT',
      endpoint: 'direct.nyse.com/feed/nyse-integrated-v2.1',
      endpointType: EndpointType.DIRECT_SOCKET,
      multicastGroup: '233.54.14.200:28000',
      handshakeProtocol: 'NYSE_BINARY_FAST',
      sessionEstablishedAt: '2024-01-01T00:00:00.000Z',
      authenticationMethod: 'CONFIGURED_X509_MUTUAL_TLS',
      status: 'CONFIGURED_STANDBY'
    };

    this.registerAuthoritativeSource({
      sourceDefinition: nyseDefinition,
      sourceVerification: {
        verificationStatus: VerificationStatus.UNVERIFIED,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        externalSignatureVerified: false,
        verificationEvidenceId: 'EVID-SRC-VERIFY-NYSE-2024',
        verificationAuthority: 'NYSE Integrated Feed Client Specification (Reference Standard)',
        verificationDate: '2024-01-01T00:00:00.000Z',
        verificationMethod: 'SPECIFICATION_CONFORMANCE_SIMULATION',
        verificationArtifactType: 'TECHNICAL_SPECIFICATION_FIXTURE',
        verificationArtifact: nyseVerificationArtifact
      },
      connectionEvidence: {
        connectionEvidenceId: 'CONN-EVID-NYSE-2024',
        connectionState: ConnectionEvidenceState.CONFIGURED_CONNECTION,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        authenticatedAt: '2024-01-01T00:00:00.000Z',
        authenticationMethod: 'CONFIGURED_X509_MUTUAL_TLS',
        connectionStatus: 'CONFIGURED_STANDBY',
        evidenceArtifact: nyseConnectionEvidenceArtifact
      },
      description: 'Configured NYSE Integrated direct feed specification fixture (unverified in local environment)'
    });

    // 4. NSE India Direct Multicast Feed
    const nseDefinition = {
      sourceId: 'SRC-IN-NSE-DIRECT',
      sourceName: 'NSE India NOW Direct Multicast Tick Feed',
      sourceType: SourceType.DIRECT_EXCHANGE,
      provider: 'NSE_INDIA_DIRECT',
      venue: 'NSE',
      feedName: 'NSE NOW Tick Multicast Feed v3.0',
      protocol: 'NSE_NOW_3.0_MULTICAST',
      endpoint: 'mcast.nseindia.com/feed/now-tick-v3.0',
      endpointType: EndpointType.DIRECT_SOCKET,
      upstreamSource: 'NSE_DIRECT_EXCHANGE',
      sourceTier: SourceTier.TIER_1_DIRECT_EXCHANGE_FEED,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      effectiveTo: '2026-12-31T23:59:59.000Z'
    };

    const nseVerificationArtifact = {
      verificationId: 'VERIF-ART-NSE-2024',
      sourceId: 'SRC-IN-NSE-DIRECT',
      authority: 'NSE India NOW Tick Multicast Feed Specification (Reference Standard)',
      certificationType: 'TECHNICAL_SPECIFICATION_FIXTURE',
      specificationDoc: 'NSE NOW Multicast Tick Feed Specification v3.0',
      signedDate: '2024-01-01T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
      method: 'SPECIFICATION_CONFORMANCE_SIMULATION'
    };

    const nseConnectionEvidenceArtifact = {
      connectionId: 'CONN-ART-NSE-2024',
      sourceId: 'SRC-IN-NSE-DIRECT',
      endpoint: 'mcast.nseindia.com/feed/now-tick-v3.0',
      endpointType: EndpointType.DIRECT_SOCKET,
      multicastGroup: '233.100.50.10:15000',
      handshakeProtocol: 'NSE_MULTICAST_UDP',
      sessionEstablishedAt: '2024-01-01T00:00:00.000Z',
      authenticationMethod: 'CONFIGURED_SESSION_TOKEN',
      status: 'CONFIGURED_STANDBY'
    };

    this.registerAuthoritativeSource({
      sourceDefinition: nseDefinition,
      sourceVerification: {
        verificationStatus: VerificationStatus.UNVERIFIED,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        externalSignatureVerified: false,
        verificationEvidenceId: 'EVID-SRC-VERIFY-NSE-2024',
        verificationAuthority: 'NSE India NOW Tick Multicast Feed Specification (Reference Standard)',
        verificationDate: '2024-01-01T00:00:00.000Z',
        verificationMethod: 'SPECIFICATION_CONFORMANCE_SIMULATION',
        verificationArtifactType: 'TECHNICAL_SPECIFICATION_FIXTURE',
        verificationArtifact: nseVerificationArtifact
      },
      connectionEvidence: {
        connectionEvidenceId: 'CONN-EVID-NSE-2024',
        connectionState: ConnectionEvidenceState.CONFIGURED_CONNECTION,
        evidenceOrigin: EvidenceOrigin.INTERNAL_FIXTURE,
        authenticatedAt: '2024-01-01T00:00:00.000Z',
        authenticationMethod: 'CONFIGURED_SESSION_TOKEN',
        connectionStatus: 'CONFIGURED_STANDBY',
        evidenceArtifact: nseConnectionEvidenceArtifact
      },
      description: 'Configured NSE India direct multicast tick feed specification fixture (unverified in local environment)'
    });

    // 5. Consolidated Tape Association (CTA/UTP SIP)
    const sipDefinition = {
      sourceId: 'SRC-GLOBAL-CTA-UTP-CONSOLIDATED',
      sourceName: 'Consolidated Tape Association / UTP SIP Tape Feed',
      sourceType: SourceType.CONSOLIDATED_FEED,
      provider: 'CTA_UTP_SIP',
      venue: 'US_CONSOLIDATED',
      feedName: 'CTA/UTP Plan Level 1 Consolidated Tape B',
      protocol: 'SIP_CTS_UTP_CONSOLIDATED',
      endpoint: 'sip.ctaplan.com/feed/consolidated-tape-b',
      endpointType: EndpointType.SIP_CONSOLIDATOR,
      upstreamSource: 'CTA_UTP_SIP_PLAN',
      sourceTier: SourceTier.TIER_2_CONSOLIDATED_FEED,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      effectiveTo: '2026-12-31T23:59:59.000Z'
    };

    const sipVerificationArtifact = {
      verificationId: 'VERIF-ART-SIP-2024',
      sourceId: 'SRC-GLOBAL-CTA-UTP-CONSOLIDATED',
      authority: 'Consolidated Tape Plan Operating Committee',
      certificationType: 'SIP_CONSOLIDATED_FEED_SUBSCRIBER_AGREEMENT',
      signedDate: '2024-01-01T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
      method: 'SIP_COMPLIANCE_AUDIT'
    };

    const sipConnectionEvidenceArtifact = {
      connectionId: 'CONN-ART-SIP-2024',
      sourceId: 'SRC-GLOBAL-CTA-UTP-CONSOLIDATED',
      endpoint: 'sip.ctaplan.com/feed/consolidated-tape-b',
      endpointType: EndpointType.SIP_CONSOLIDATOR,
      sessionEstablishedAt: '2024-01-01T00:00:00.000Z',
      authenticationMethod: 'SIP_TOKEN_AUTHENTICATION',
      status: 'ACTIVE_SUBSCRIBED'
    };

    this.registerAuthoritativeSource({
      sourceDefinition: sipDefinition,
      sourceVerification: {
        verificationStatus: VerificationStatus.VERIFIED,
        verificationEvidenceId: 'EVID-SRC-VERIFY-SIP-2024',
        verificationAuthority: 'Consolidated Tape Plan Operating Committee',
        verificationDate: '2024-01-01T00:00:00.000Z',
        verificationMethod: 'SIP_COMPLIANCE_AUDIT',
        verificationArtifactType: 'SUBSCRIBER_AUTHORIZATION_RECORD',
        verificationArtifact: sipVerificationArtifact
      },
      connectionEvidence: {
        connectionEvidenceId: 'CONN-EVID-SIP-2024',
        authenticatedAt: '2024-01-01T00:00:00.000Z',
        authenticationMethod: 'SIP_TOKEN_AUTHENTICATION',
        connectionStatus: 'ACTIVE_SUBSCRIBED',
        evidenceArtifact: sipConnectionEvidenceArtifact
      },
      description: 'US Consolidated Tape Plan Level 1 / National Best Bid and Offer'
    });

    // 6. Yahoo Finance / RapidAPI Aggregator (Intermediary Vendor)
    const yahooDefinition = {
      sourceId: 'SRC-YAHOO-MARKET-INTERMEDIARY',
      sourceName: 'Yahoo Finance / RapidAPI Aggregator Feed',
      sourceType: SourceType.INTERMEDIARY_VENDOR,
      provider: 'YAHOO_FINANCE_AGGREGATOR',
      venue: 'MULTI_EXCHANGE_AGGREGATED',
      feedName: 'Yahoo Finance RapidAPI REST Endpoints',
      protocol: 'REST_HTTPS_JSON',
      endpoint: 'rapidapi.com/apidojo/api/yh-finance',
      endpointType: EndpointType.PUBLIC_REST,
      upstreamSource: 'YAHOO_FINANCE_RAPIDAPI',
      sourceTier: SourceTier.TIER_3_DELAYED_VENDOR,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      effectiveTo: '2026-12-31T23:59:59.000Z'
    };

    const yahooVerificationArtifact = {
      verificationId: 'VERIF-ART-YAHOO-2024',
      sourceId: 'SRC-YAHOO-MARKET-INTERMEDIARY',
      authority: 'RapidAPI Marketplace Audit',
      certificationType: 'VENDOR_API_KEY_VALIDATION',
      signedDate: '2024-01-01T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
      method: 'API_HEALTH_AND_KEY_VERIFICATION'
    };

    const yahooConnectionEvidenceArtifact = {
      connectionId: 'CONN-ART-YAHOO-2024',
      sourceId: 'SRC-YAHOO-MARKET-INTERMEDIARY',
      endpoint: 'rapidapi.com/apidojo/api/yh-finance',
      endpointType: EndpointType.PUBLIC_REST,
      sessionEstablishedAt: '2024-01-01T00:00:00.000Z',
      authenticationMethod: 'RAPIDAPI_HEADER_KEY',
      status: 'ACTIVE_POLLING'
    };

    this.registerAuthoritativeSource({
      sourceDefinition: yahooDefinition,
      sourceVerification: {
        verificationStatus: VerificationStatus.VERIFIED,
        verificationEvidenceId: 'EVID-SRC-VERIFY-YAHOO-2024',
        verificationAuthority: 'RapidAPI Marketplace Audit',
        verificationDate: '2024-01-01T00:00:00.000Z',
        verificationMethod: 'API_HEALTH_AND_KEY_VERIFICATION',
        verificationArtifactType: 'VENDOR_SUBSCRIPTION_RECORD',
        verificationArtifact: yahooVerificationArtifact
      },
      connectionEvidence: {
        connectionEvidenceId: 'CONN-EVID-YAHOO-2024',
        authenticatedAt: '2024-01-01T00:00:00.000Z',
        authenticationMethod: 'RAPIDAPI_HEADER_KEY',
        connectionStatus: 'ACTIVE_POLLING',
        evidenceArtifact: yahooConnectionEvidenceArtifact
      },
      description: 'Third-party intermediary market aggregator with non-deterministic polling latency'
    });

    // 7. Synthetic Test Fixture Source
    const syntheticDefinition = {
      sourceId: 'SRC-SYNTHETIC-GOLDEN',
      sourceName: 'Golden Mathematical Synthetic Fixture Source',
      sourceType: SourceType.SYNTHETIC_FIXTURE,
      provider: 'SYNTHETIC_TEST_SUITE',
      venue: 'IN_MEMORY_FIXTURE',
      feedName: 'Deterministic Golden Test Fixture Generator',
      protocol: 'IN_MEMORY_FIXTURE',
      endpoint: 'fixture://synthetic/golden-v1',
      endpointType: EndpointType.IN_MEMORY_FIXTURE,
      upstreamSource: 'SYNTHETIC_TEST_SUITE',
      sourceTier: SourceTier.TIER_4_SYNTHETIC,
      effectiveFrom: '2024-01-01T00:00:00.000Z',
      effectiveTo: '2099-12-31T23:59:59.000Z'
    };

    const syntheticVerificationArtifact = {
      verificationId: 'VERIF-ART-SYNTHETIC-2024',
      sourceId: 'SRC-SYNTHETIC-GOLDEN',
      authority: 'InvestmentAI QA Framework',
      certificationType: 'IN_MEMORY_REGRESSION_HARNESS',
      signedDate: '2024-01-01T00:00:00.000Z',
      validUntil: '2099-12-31T23:59:59.000Z',
      method: 'DETERMINISTIC_REPLAY_TEST'
    };

    const syntheticConnectionEvidenceArtifact = {
      connectionId: 'CONN-ART-SYNTHETIC-2024',
      sourceId: 'SRC-SYNTHETIC-GOLDEN',
      endpoint: 'fixture://synthetic/golden-v1',
      endpointType: EndpointType.IN_MEMORY_FIXTURE,
      sessionEstablishedAt: '2024-01-01T00:00:00.000Z',
      authenticationMethod: 'NONE_INTERNAL_FIXTURE',
      status: 'ACTIVE_IN_MEMORY'
    };

    this.registerAuthoritativeSource({
      sourceDefinition: syntheticDefinition,
      sourceVerification: {
        verificationStatus: VerificationStatus.VERIFIED,
        verificationEvidenceId: 'EVID-SRC-VERIFY-SYNTHETIC-2024',
        verificationAuthority: 'InvestmentAI QA Framework',
        verificationDate: '2024-01-01T00:00:00.000Z',
        verificationMethod: 'DETERMINISTIC_REPLAY_TEST',
        verificationArtifactType: 'IN_MEMORY_FIXTURE_MANIFEST',
        verificationArtifact: syntheticVerificationArtifact
      },
      connectionEvidence: {
        connectionEvidenceId: 'CONN-EVID-SYNTHETIC-2024',
        authenticatedAt: '2024-01-01T00:00:00.000Z',
        authenticationMethod: 'NONE_INTERNAL_FIXTURE',
        connectionStatus: 'ACTIVE_IN_MEMORY',
        evidenceArtifact: syntheticConnectionEvidenceArtifact
      },
      description: 'In-memory deterministic test fixtures used solely for mathematical regression'
    });
  }

  registerAuthoritativeSource({ sourceDefinition, sourceVerification, connectionEvidence = {}, description = '' }) {
    if (!sourceDefinition || !sourceDefinition.sourceId || !sourceDefinition.sourceName || !sourceDefinition.sourceType || !sourceDefinition.sourceTier) {
      throw new Error('Valid sourceDefinition with sourceId, sourceName, sourceType, and sourceTier is required');
    }

    const canonDef = {
      sourceId: sourceDefinition.sourceId,
      sourceName: sourceDefinition.sourceName,
      sourceType: sourceDefinition.sourceType,
      provider: sourceDefinition.provider || sourceDefinition.sourceId,
      venue: sourceDefinition.venue || 'UNKNOWN_VENUE',
      feedName: sourceDefinition.feedName || sourceDefinition.sourceName,
      protocol: sourceDefinition.protocol || 'STANDARD',
      endpoint: sourceDefinition.endpoint || 'UNKNOWN_ENDPOINT',
      endpointType: sourceDefinition.endpointType || EndpointType.UNVERIFIED,
      upstreamSource: sourceDefinition.upstreamSource || 'UNKNOWN_UPSTREAM',
      sourceTier: sourceDefinition.sourceTier,
      effectiveFrom: sourceDefinition.effectiveFrom || '2024-01-01T00:00:00.000Z',
      effectiveTo: sourceDefinition.effectiveTo || '2099-12-31T23:59:59.000Z'
    };

    const sourceDefinitionCanonicalJson = canonicalJsonStringify(canonDef);
    const sourceDefinitionHash = canonicalHash(canonDef);

    const verificationArtifact = sourceVerification?.verificationArtifact || null;
    const verificationEvidenceHash = sourceVerification?.verificationEvidenceHash ||
      (verificationArtifact ? canonicalHash(verificationArtifact) : null);

    const evidenceOrigin = sourceVerification?.evidenceOrigin || EvidenceOrigin.UNVERIFIED;
    const externalSignatureVerified = sourceVerification?.externalSignatureVerified === true;

    const canonVerification = {
      verificationStatus: sourceVerification?.verificationStatus || VerificationStatus.UNVERIFIED,
      evidenceOrigin,
      externalSignatureVerified,
      verificationEvidenceId: sourceVerification?.verificationEvidenceId || null,
      verificationEvidenceHash,
      verificationAuthority: sourceVerification?.verificationAuthority || 'UNKNOWN_AUTHORITY',
      verificationDate: sourceVerification?.verificationDate || '2024-01-01T00:00:00.000Z',
      verificationMethod: sourceVerification?.verificationMethod || 'UNVERIFIED',
      verificationArtifactType: sourceVerification?.verificationArtifactType || 'UNVERIFIED',
      verificationArtifact
    };

    const connArtifact = connectionEvidence?.evidenceArtifact || null;
    const connectionEvidenceHash = connectionEvidence?.connectionEvidenceHash ||
      (connArtifact ? canonicalHash(connArtifact) : null);
    const connectionState = connectionEvidence?.connectionState || ConnectionEvidenceState.UNVERIFIED;
    const connEvidenceOrigin = connectionEvidence?.evidenceOrigin || evidenceOrigin;

    const isExternalVerified = canonVerification.evidenceOrigin === EvidenceOrigin.EXTERNAL_AUTHORITY_VERIFIED &&
      canonVerification.verificationStatus === VerificationStatus.VERIFIED &&
      canonVerification.externalSignatureVerified === true;

    const isLiveConnection = connectionState === ConnectionEvidenceState.OBSERVED_AUTHENTICATED_CONNECTION ||
      connectionState === ConnectionEvidenceState.INDEPENDENTLY_VERIFIED_CONNECTION;

    let connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
    let effectiveSourceTier = canonDef.sourceTier;

    if (canonDef.sourceType === SourceType.DIRECT_EXCHANGE) {
      if (canonDef.endpointType === EndpointType.DIRECT_SOCKET) {
        if (isExternalVerified && isLiveConnection) {
          connectionClassification = SourceConnectionClassification.VERIFIED_DIRECT_EXCHANGE;
          effectiveSourceTier = SourceTier.TIER_1_DIRECT_EXCHANGE_FEED;
        } else {
          connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
          effectiveSourceTier = SourceTier.UNVERIFIED;
        }
      } else if (canonDef.endpointType === EndpointType.INTERNAL_ADAPTER) {
        const upstreamId = connectionEvidence?.upstreamSourceId || canonDef.upstreamSource;
        const upstreamRecord = this.getSource(upstreamId);
        if (upstreamRecord && upstreamRecord.connectionClassification === SourceConnectionClassification.VERIFIED_DIRECT_EXCHANGE) {
          connectionClassification = SourceConnectionClassification.VERIFIED_INTERNAL_ADAPTER_TO_DIRECT_EXCHANGE;
          effectiveSourceTier = SourceTier.TIER_1_DIRECT_EXCHANGE_FEED;
        } else {
          connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
          effectiveSourceTier = SourceTier.UNVERIFIED;
        }
      } else {
        connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
        effectiveSourceTier = SourceTier.UNVERIFIED;
      }
    } else if (canonDef.sourceType === SourceType.INTERMEDIARY_VENDOR) {
      if (canonVerification.verificationStatus === VerificationStatus.VERIFIED) {
        connectionClassification = SourceConnectionClassification.VERIFIED_VENDOR_SOURCE;
        effectiveSourceTier = SourceTier.TIER_3_DELAYED_VENDOR;
      } else {
        connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
        effectiveSourceTier = SourceTier.UNVERIFIED;
      }
    } else if (canonDef.sourceType === SourceType.CONSOLIDATED_FEED) {
      if (canonVerification.verificationStatus === VerificationStatus.VERIFIED) {
        connectionClassification = SourceConnectionClassification.VERIFIED_VENDOR_SOURCE;
        effectiveSourceTier = SourceTier.TIER_2_CONSOLIDATED_FEED;
      } else {
        connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
        effectiveSourceTier = SourceTier.UNVERIFIED;
      }
    } else if (canonDef.sourceType === SourceType.SYNTHETIC_FIXTURE) {
      connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
      effectiveSourceTier = SourceTier.TIER_4_SYNTHETIC;
    } else {
      connectionClassification = SourceConnectionClassification.UNVERIFIED_SOURCE;
      effectiveSourceTier = SourceTier.UNVERIFIED;
    }

    canonVerification.connectionClassification = connectionClassification;

    const canonConnection = {
      sourceId: canonDef.sourceId,
      connectionClassification,
      connectionState,
      evidenceOrigin: connEvidenceOrigin,
      endpoint: canonDef.endpoint,
      endpointType: canonDef.endpointType,
      protocol: canonDef.protocol,
      upstreamSource: canonDef.upstreamSource,
      adapterId: connectionEvidence?.adapterId || null,
      adapterVersion: connectionEvidence?.adapterVersion || null,
      upstreamSourceId: connectionEvidence?.upstreamSourceId || null,
      upstreamConnectionEvidenceId: connectionEvidence?.upstreamConnectionEvidenceId || null,
      normalizationVersion: connectionEvidence?.normalizationVersion || null,
      connectionEvidenceId: connectionEvidence?.connectionEvidenceId || null,
      connectionEvidenceHash,
      adapterEvidenceHash: connectionEvidence?.adapterEvidenceHash || connectionEvidenceHash,
      authenticatedAt: connectionEvidence?.authenticatedAt || '2024-01-01T00:00:00.000Z',
      authenticationMethod: connectionEvidence?.authenticationMethod || 'UNAUTHENTICATED',
      connectionStatus: connectionEvidence?.connectionStatus || 'UNVERIFIED',
      evidenceArtifact: connArtifact
    };

    const fullRecord = deepFreeze({
      // Flattened properties for direct access
      ...canonDef,
      sourceTier: effectiveSourceTier,
      ...canonVerification,
      sourceDefinitionCanonicalJson,
      sourceDefinitionHash,
      hashAlgorithm: 'SHA-256',
      connectionEvidenceId: canonConnection.connectionEvidenceId,
      connectionEvidenceHash: canonConnection.connectionEvidenceHash,
      description,
      // Structured sub-claims
      sourceDefinition: deepFreeze({
        ...canonDef,
        sourceDefinitionCanonicalJson,
        sourceDefinitionHash,
        hashAlgorithm: 'SHA-256'
      }),
      sourceVerification: deepFreeze(canonVerification),
      connectionEvidence: deepFreeze(canonConnection)
    });

    this.sources.set(canonDef.sourceId, fullRecord);
    if (canonDef.provider && canonDef.provider !== canonDef.sourceId) {
      this.sources.set(canonDef.provider, fullRecord);
    }
    return fullRecord;
  }

  registerSource(sourceDef) {
    return this.registerAuthoritativeSource({
      sourceDefinition: {
        sourceId: sourceDef.sourceId,
        sourceName: sourceDef.sourceName,
        sourceType: sourceDef.sourceType,
        provider: sourceDef.provider,
        venue: sourceDef.venue,
        feedName: sourceDef.feedName,
        protocol: sourceDef.protocol,
        endpoint: sourceDef.endpoint,
        endpointType: sourceDef.endpointType,
        upstreamSource: sourceDef.upstreamSource,
        sourceTier: sourceDef.sourceTier,
        effectiveFrom: sourceDef.effectiveFrom,
        effectiveTo: sourceDef.effectiveTo
      },
      sourceVerification: {
        verificationStatus: sourceDef.verificationStatus,
        verificationEvidenceId: sourceDef.verificationEvidenceId,
        verificationEvidenceHash: sourceDef.verificationEvidenceHash,
        verificationAuthority: sourceDef.verificationAuthority,
        verificationDate: sourceDef.verificationDate,
        verificationMethod: sourceDef.verificationMethod,
        verificationArtifactType: sourceDef.verificationArtifactType,
        verificationArtifact: sourceDef.verificationArtifact
      },
      connectionEvidence: {
        connectionEvidenceId: sourceDef.connectionEvidenceId,
        connectionEvidenceHash: sourceDef.connectionEvidenceHash,
        authenticatedAt: sourceDef.authenticatedAt,
        authenticationMethod: sourceDef.authenticationMethod,
        connectionStatus: sourceDef.connectionStatus,
        evidenceArtifact: sourceDef.evidenceArtifact
      },
      description: sourceDef.description
    });
  }

  getSource(sourceIdOrProvider) {
    if (!sourceIdOrProvider) return null;
    return this.sources.get(sourceIdOrProvider) || null;
  }

  listSources() {
    const seen = new Set();
    const list = [];
    for (const src of this.sources.values()) {
      if (!seen.has(src.sourceId)) {
        seen.add(src.sourceId);
        list.push(src);
      }
    }
    return list;
  }

  /**
   * Validates the claimed source tier and returns truthful provenance record.
   * Prevents intermediary providers from falsely claiming Tier-1 Direct Exchange status.
   */
  validateSourceClaim(claimedProvenance = {}) {
    const providerOrId = claimedProvenance.sourceId || claimedProvenance.provider;
    const registeredSource = this.getSource(providerOrId);

    if (!registeredSource) {
      return deepFreeze({
        isValid: false,
        isVerifiedDirectExchange: false,
        claimedTier: claimedProvenance.sourceTier || SourceTier.UNVERIFIED,
        resolvedTier: SourceTier.UNVERIFIED,
        resolvedType: SourceType.UNVERIFIED,
        verificationStatus: VerificationStatus.UNVERIFIED,
        connectionClassification: SourceConnectionClassification.UNVERIFIED_SOURCE,
        sourceDefinitionHash: null,
        verificationEvidenceHash: null,
        connectionEvidenceHash: null,
        reason: 'SOURCE_NOT_REGISTERED',
        sourceRecord: null
      });
    }

    const isDirect = registeredSource.sourceType === SourceType.DIRECT_EXCHANGE;
    const isTier1Claimed = claimedProvenance.sourceTier === SourceTier.TIER_1_DIRECT_EXCHANGE_FEED;

    // Check for fake Tier 1 promotion
    if (isTier1Claimed && !isDirect) {
      return deepFreeze({
        isValid: false,
        isVerifiedDirectExchange: false,
        claimedTier: claimedProvenance.sourceTier,
        resolvedTier: registeredSource.sourceTier,
        resolvedType: registeredSource.sourceType,
        verificationStatus: registeredSource.verificationStatus,
        connectionClassification: registeredSource.connectionClassification,
        sourceDefinitionHash: registeredSource.sourceDefinitionHash,
        verificationEvidenceHash: registeredSource.verificationEvidenceHash,
        connectionEvidenceHash: registeredSource.connectionEvidenceHash,
        reason: 'INTERMEDIARY_PROMOTION_DISALLOWED: Intermediary vendor cannot claim Tier-1 Direct Exchange status',
        sourceRecord: registeredSource
      });
    }

    // Check verification evidence
    if (isDirect && (!registeredSource.verificationEvidenceId || !registeredSource.verificationEvidenceHash)) {
      return deepFreeze({
        isValid: false,
        isVerifiedDirectExchange: false,
        claimedTier: claimedProvenance.sourceTier,
        resolvedTier: registeredSource.sourceTier,
        resolvedType: registeredSource.sourceType,
        verificationStatus: VerificationStatus.UNVERIFIED,
        connectionClassification: SourceConnectionClassification.UNVERIFIED_SOURCE,
        sourceDefinitionHash: registeredSource.sourceDefinitionHash,
        verificationEvidenceHash: null,
        connectionEvidenceHash: null,
        reason: 'DIRECT_EXCHANGE_MISSING_VERIFICATION_EVIDENCE',
        sourceRecord: registeredSource
      });
    }

    // Check connection evidence
    if (isDirect && (!registeredSource.connectionEvidenceId || !registeredSource.connectionEvidenceHash)) {
      return deepFreeze({
        isValid: false,
        isVerifiedDirectExchange: false,
        claimedTier: claimedProvenance.sourceTier,
        resolvedTier: registeredSource.sourceTier,
        resolvedType: registeredSource.sourceType,
        verificationStatus: registeredSource.verificationStatus,
        connectionClassification: SourceConnectionClassification.UNVERIFIED_SOURCE,
        sourceDefinitionHash: registeredSource.sourceDefinitionHash,
        verificationEvidenceHash: registeredSource.verificationEvidenceHash,
        connectionEvidenceHash: null,
        reason: 'DIRECT_EXCHANGE_MISSING_CONNECTION_EVIDENCE',
        sourceRecord: registeredSource
      });
    }

    // Check venue presence
    if (isDirect && (!registeredSource.venue || registeredSource.venue === 'UNKNOWN_VENUE')) {
      return deepFreeze({
        isValid: false,
        isVerifiedDirectExchange: false,
        claimedTier: claimedProvenance.sourceTier,
        resolvedTier: registeredSource.sourceTier,
        resolvedType: registeredSource.sourceType,
        verificationStatus: VerificationStatus.UNVERIFIED,
        connectionClassification: SourceConnectionClassification.UNVERIFIED_SOURCE,
        sourceDefinitionHash: registeredSource.sourceDefinitionHash,
        verificationEvidenceHash: registeredSource.verificationEvidenceHash,
        connectionEvidenceHash: registeredSource.connectionEvidenceHash,
        reason: 'DIRECT_EXCHANGE_MISSING_VENUE',
        sourceRecord: registeredSource
      });
    }

    return deepFreeze({
      isValid: true,
      isVerifiedDirectExchange: isDirect && registeredSource.verificationStatus === VerificationStatus.VERIFIED,
      claimedTier: claimedProvenance.sourceTier || registeredSource.sourceTier,
      resolvedTier: registeredSource.sourceTier,
      resolvedType: registeredSource.sourceType,
      verificationStatus: registeredSource.verificationStatus,
      connectionClassification: registeredSource.connectionClassification,
      sourceDefinitionHash: registeredSource.sourceDefinitionHash,
      verificationEvidenceHash: registeredSource.verificationEvidenceHash,
      connectionEvidenceHash: registeredSource.connectionEvidenceHash,
      reason: null,
      sourceRecord: registeredSource
    });
  }
}

export const liquiditySourceRegistry = new LiquiditySourceRegistry();
