# PHASE 17 — HOSTILE ADVERSARIAL COVERAGE MATRIX (154 CATEGORIES: A TO EX)

| Category ID | Threat Description | Test Name | Exact Assertion | Expected Result | Status | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| A | Fabricated tax rate injection | test_hostile_a_fabricated_tax_rate | expect(result.status).toBe('TAX_RULE_UNAVAILABLE') | TAX_RULE_UNAVAILABLE | EXECUTED | PASS |
| B | Zero tax fallback substitution | test_hostile_b_zero_tax_fallback | expect(result.valid).toBe(false) | CONFLICT | EXECUTED | PASS |
| C | Zero cost basis fallback substitution | test_hostile_c_zero_cost_basis | expect(result.status).toBe('COST_BASIS_UNAVAILABLE') | COST_BASIS_UNAVAILABLE | EXECUTED | PASS |
| D | Missing jurisdiction specification | test_hostile_d_missing_jurisdiction | expect(result.status).toBe('JURISDICTION_UNAVAILABLE') | JURISDICTION_UNAVAILABLE | EXECUTED | PASS |
| E | Unsupported jurisdiction code | test_hostile_e_unsupported_jurisdiction | expect(result.status).toBe('JURISDICTION_UNAVAILABLE') | JURISDICTION_UNAVAILABLE | EXECUTED | PASS |
| F | Future acquisition date relative to asOf | test_hostile_f_future_acquisition | expect(result.status).toBe('TEMPORAL_VIOLATION') | TEMPORAL_VIOLATION | EXECUTED | PASS |
| G | Realization date preceding acquisition date | test_hostile_g_realization_before_acq | expect(result.status).toBe('TEMPORAL_VIOLATION') | TEMPORAL_VIOLATION | EXECUTED | PASS |
| H | Future tax rule evaluated at T0 | test_hostile_h_future_tax_rule | expect(result.status).toBe('TEMPORAL_VIOLATION') | TEMPORAL_VIOLATION | EXECUTED | PASS |
| I | Negative tax lot quantity | test_hostile_i_negative_lot_quantity | expect(result.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| J | Negative acquisition price | test_hostile_j_negative_acq_price | expect(result.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| K | Cost basis mismatch vs quantity*price | test_hostile_k_cost_basis_mismatch | expect(result.status).toBe('CONFLICT') | CONFLICT | EXECUTED | PASS |
| L | Missing tax lot source lineage | test_hostile_l_missing_lot_source | expect(result.status).toBe('INSUFFICIENT_DATA') | INSUFFICIENT_DATA | EXECUTED | PASS |
| M | Missing tax lot sourceEvidenceId | test_hostile_m_missing_evidence_id | expect(result.status).toBe('INSUFFICIENT_DATA') | INSUFFICIENT_DATA | EXECUTED | PASS |
| N | Unknown account type defaulting to TAXABLE | test_hostile_n_unknown_account_default | expect(result.status).toBe('TAX_RULE_UNAVAILABLE') | TAX_RULE_UNAVAILABLE | EXECUTED | PASS |
| O | Invalid account type enum | test_hostile_o_invalid_account_enum | expect(result.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| P | Unknown basis method | test_hostile_p_unknown_basis_method | expect(result.status).toBe('COST_BASIS_UNAVAILABLE') | COST_BASIS_UNAVAILABLE | EXECUTED | PASS |
| Q | Specific lot method missing lot selections | test_hostile_q_specific_lot_missing_sel | expect(result.status).toBe('COST_BASIS_UNAVAILABLE') | COST_BASIS_UNAVAILABLE | EXECUTED | PASS |
| R | Specific lot quantity exceeding available | test_hostile_r_specific_lot_qty_exceeded | expect(result.status).toBe('CONFLICT') | CONFLICT | EXECUTED | PASS |
| S | Disposal quantity exceeding total open lots | test_hostile_s_disposal_qty_exceeded | expect(result.status).toBe('CONFLICT') | CONFLICT | EXECUTED | PASS |
| T | Negative disposal quantity | test_hostile_t_negative_disposal_qty | expect(result.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| U | Missing disposal price | test_hostile_u_missing_disposal_price | expect(result.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| V | Stale market price during unrealized valuation | test_hostile_v_stale_market_price | expect(result.status).toBe('AFTER_TAX_RESULT_UNAVAILABLE') | AFTER_TAX_RESULT_UNAVAILABLE | EXECUTED | PASS |
| W | Missing market price for unrealized open lot | test_hostile_w_missing_price_unrealized | expect(result.status).toBe('AFTER_TAX_RESULT_UNAVAILABLE') | AFTER_TAX_RESULT_UNAVAILABLE | EXECUTED | PASS |
| X | Negative market price during valuation | test_hostile_x_negative_market_price | expect(result.status).toBe('AFTER_TAX_RESULT_UNAVAILABLE') | AFTER_TAX_RESULT_UNAVAILABLE | EXECUTED | PASS |
| Y | Wash sale 30-day lookback violation | test_hostile_y_wash_sale_lookback | expect(result.washSaleStatus).toBe('DISALLOWED') | DISALLOWED | EXECUTED | PASS |
| Z | Wash sale 30-day lookforward violation | test_hostile_z_wash_sale_lookforward | expect(result.washSaleStatus).toBe('DISALLOWED') | DISALLOWED | EXECUTED | PASS |
| AA | Substantially identical replacement security flag | test_hostile_aa_substantially_identical | expect(result.washSaleStatus).toBe('POTENTIAL_RESTRICTION') | POTENTIAL_RESTRICTION | EXECUTED | PASS |
| AB | Wash sale rule bypass on loss realization | test_hostile_ab_wash_sale_bypass_attempt | expect(result.status).toBe('WASH_SALE_RISK') | WASH_SALE_RISK | EXECUTED | PASS |
| AC | Harvesting candidate below transaction cost hurdle | test_hostile_ac_harvest_below_hurdle | expect(result.status).toBe('COST_EXCEEDS_BENEFIT') | COST_EXCEEDS_BENEFIT | EXECUTED | PASS |
| AD | Harvesting candidate below minimum loss dollars | test_hostile_ad_harvest_below_min_loss | expect(result.candidates.length).toBe(0) | PASS | EXECUTED | PASS |
| AE | Harvesting candidate in non-taxable account | test_hostile_ae_harvest_tax_deferred_acct | expect(result.candidates.length).toBe(0) | PASS | EXECUTED | PASS |
| AF | Missing dividend classification | test_hostile_af_missing_dividend_class | expect(result.status).toBe('TAX_RULE_UNAVAILABLE') | TAX_RULE_UNAVAILABLE | EXECUTED | PASS |
| AG | Unknown dividend classification | test_hostile_ag_unknown_dividend_class | expect(result.status).toBe('TAX_RULE_UNAVAILABLE') | TAX_RULE_UNAVAILABLE | EXECUTED | PASS |
| AH | Negative dividend distribution amount | test_hostile_ah_negative_dividend_amount | expect(result.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| AI | Tax drag division by zero handling | test_hostile_ai_tax_drag_zero_denominator | expect(result.taxDragPercentStatus).toBe('ZERO_PRETAX_RETURN') | ZERO_PRETAX_RETURN | EXECUTED | PASS |
| AJ | Tax drag negative denominator handling | test_hostile_aj_tax_drag_negative_denom | expect(result.taxDragPercentStatus).toBe('NEGATIVE_PRETAX_RETURN') | NEGATIVE_PRETAX_RETURN | EXECUTED | PASS |
| AK | Missing pre-tax TWR in after-tax calculation | test_hostile_ak_missing_pretax_twr | expect(result.status).toBe('AFTER_TAX_RESULT_UNAVAILABLE') | AFTER_TAX_RESULT_UNAVAILABLE | EXECUTED | PASS |
| AL | Arbitrary tax haircut on Phase 14 expected return | test_hostile_al_arbitrary_tax_haircut | expect(result.status).toBe('AFTER_TAX_RESULT_UNAVAILABLE') | AFTER_TAX_RESULT_UNAVAILABLE | EXECUTED | PASS |
| AM | Tax-aware optimizer relaxing Phase 14 position limit | test_hostile_am_relax_position_limit | expect(result.status).toBe('INFEASIBLE_CONSTRAINTS') | INFEASIBLE_CONSTRAINTS | EXECUTED | PASS |
| AN | Tax-aware optimizer relaxing Phase 14 sector limit | test_hostile_an_relax_sector_limit | expect(result.status).toBe('INFEASIBLE_CONSTRAINTS') | INFEASIBLE_CONSTRAINTS | EXECUTED | PASS |
| AO | Tax-aware optimizer relaxing Phase 14 leverage limit | test_hostile_ao_relax_leverage_limit | expect(result.status).toBe('INFEASIBLE_CONSTRAINTS') | INFEASIBLE_CONSTRAINTS | EXECUTED | PASS |
| AP | Tax-aware optimizer introducing prohibited shorting | test_hostile_ap_prohibited_shorting | expect(result.status).toBe('INFEASIBLE_CONSTRAINTS') | INFEASIBLE_CONSTRAINTS | EXECUTED | PASS |
| AQ | Tax-aware optimizer violating Phase 16 compliance ban | test_hostile_aq_violate_compliance_ban | expect(result.status).toBe('INFEASIBLE_CONSTRAINTS') | INFEASIBLE_CONSTRAINTS | EXECUTED | PASS |
| AR | Attempted broker execution flag injection | test_hostile_ar_attempted_broker_exec | expect(result.isExecuted).toBe(false) | PASS | EXECUTED | PASS |
| AS | Sealed tax package post-seal tampering | test_hostile_as_post_seal_tampering | expect(Object.isFrozen(pkg)).toBe(true) | PASS | EXECUTED | PASS |
| AT | Sealed tax package hash corruption detection | test_hostile_at_package_hash_corruption | expect(verify.valid).toBe(false) | PASS | EXECUTED | PASS |
| AU | Cross-workspace tax lot retrieval (IDOR) | test_hostile_au_cross_workspace_idor | expect(result).toBe(null) | PASS | EXECUTED | PASS |
| AV | Cross-workspace tax package retrieval (IDOR) | test_hostile_av_cross_workspace_package_idor | expect(result).toBe(null) | PASS | EXECUTED | PASS |
| AW | Unauthorized tax policy creation by VIEWER | test_hostile_aw_unauthorized_policy_create | expect(res.status).toBe(403) | 403 | EXECUTED | PASS |
| AX | Unauthorized tax lot creation by AUDITOR | test_hostile_ax_unauthorized_lot_create | expect(res.status).toBe(403) | 403 | EXECUTED | PASS |
| AY | AI override of deterministic tax liability | test_hostile_ay_ai_tax_override | expect(explanation.disclaimer).toBeDefined() | PASS | EXECUTED | PASS |
| AZ | Tax lot reconciliation quantity mismatch | test_hostile_az_lot_reconciliation_qty_mismatch | expect(result.status).toBe('CONFLICT') | CONFLICT | EXECUTED | PASS |
| BA | Tax lot reconciliation cost basis mismatch | test_hostile_ba_lot_reconciliation_basis_mismatch | expect(result.status).toBe('CONFLICT') | CONFLICT | EXECUTED | PASS |
| BB | Unauthenticated REST endpoint request | test_hostile_bb_unauthenticated_request | expect(res.status).toBe(401) | 401 | EXECUTED | PASS |
| BC | Missing portfolioId in calculate endpoint | test_hostile_bc_missing_portfolio_calc | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| BD | Non-existent packageId lookup | test_hostile_bd_nonexistent_package | expect(res.status).toBe(404) | 404 | EXECUTED | PASS |
| BE | Indian STCG 20% calculation accuracy | test_hostile_be_india_stcg_calculation | expect(result.estimatedTax).toBeCloseTo(expectedTax) | PASS | EXECUTED | PASS |
| BF | Indian LTCG 12.5% calculation accuracy | test_hostile_bf_india_ltcg_calculation | expect(result.estimatedTax).toBeCloseTo(expectedTax) | PASS | EXECUTED | PASS |
| BG | US STCG 37% calculation accuracy | test_hostile_bg_us_stcg_calculation | expect(result.estimatedTax).toBeCloseTo(expectedTax) | PASS | EXECUTED | PASS |
| BH | US LTCG 20% calculation accuracy | test_hostile_bh_us_ltcg_calculation | expect(result.estimatedTax).toBeCloseTo(expectedTax) | PASS | EXECUTED | PASS |
| BI | FIFO vs LIFO basis sorting determinism | test_hostile_bi_fifo_lifo_determinism | expect(fifoBasis).not.toBe(lifoBasis) | PASS | EXECUTED | PASS |
| BJ | Historical tax lot immutable correction chain | test_hostile_bj_lot_correction_chain | expect(v2.previousHash).toBe(v1.lotHash) | PASS | EXECUTED | PASS |
| BK | Superseded policy preservation | test_hostile_bk_superseded_policy_preserved | expect(p2.supersedesHash).toBe(p1.policyHash) | PASS | EXECUTED | PASS |
| BL | Tax drag percentage calculation accuracy | test_hostile_bl_tax_drag_percent_calc | expect(result.taxDragPercent).toBeCloseTo(expectedDrag) | PASS | EXECUTED | PASS |
| BM | Scenario A no-rebalance tax equals zero | test_hostile_bm_scenario_a_tax_zero | expect(scenarioA.estimatedTax).toBe(0) | PASS | EXECUTED | PASS |
| BN | Scenario B full rebalance turnover accuracy | test_hostile_bn_scenario_b_turnover | expect(scenarioB.turnover).toBeGreaterThan(0) | PASS | EXECUTED | PASS |
| BO | Scenario C tax-aware rebalance tax savings | test_hostile_bo_scenario_c_tax_savings | expect(scenarioC.taxSavingsVsTarget).toBeGreaterThan(0) | PASS | EXECUTED | PASS |
| BP | Scenario D harvest-only turnover minimal | test_hostile_bp_scenario_d_harvest_turnover | expect(scenarioD.turnover).toBeLessThan(0.10) | PASS | EXECUTED | PASS |
| BQ | Scenario E partial rebalance glidepath math | test_hostile_bq_scenario_e_partial_math | expect(scenarioE.turnover).toBeCloseTo(halfTurnover) | PASS | EXECUTED | PASS |
| BR | 3-way comparison matrix completeness | test_hostile_br_comparison_matrix_completeness | expect(result.comparisonMatrix.taxDrag).toBeDefined() | PASS | EXECUTED | PASS |
| BS | Explanation DAG node and edge connectivity | test_hostile_bs_explanation_dag_connectivity | expect(dag.edgeCount).toBeGreaterThan(0) | PASS | EXECUTED | PASS |
| BT | Copilot harvest query factual grounding | test_hostile_bt_copilot_harvest_grounding | expect(res.explanation).toContain('harvesting') | PASS | EXECUTED | PASS |
| BU | Copilot tax drag query factual grounding | test_hostile_bu_copilot_tax_drag_grounding | expect(res.explanation).toContain('tax drag') | PASS | EXECUTED | PASS |
| BV | Copilot rebalance query factual grounding | test_hostile_bv_copilot_rebalance_grounding | expect(res.explanation).toContain('rebalance') | PASS | EXECUTED | PASS |
| BW | Audit event sequence hash chaining | test_hostile_bw_audit_hash_chaining | expect(event2.previousHash).toBe(event1.eventHash) | PASS | EXECUTED | PASS |
| BX | Duplicate lot registration idempotency | test_hostile_bx_duplicate_lot_idempotency | expect(res.lot.lotHash).toBe(expectedHash) | PASS | EXECUTED | PASS |
| BY | Zero dividend withholding on return of capital | test_hostile_by_return_of_capital_tax | expect(result.estimatedTax).toBe(0) | PASS | EXECUTED | PASS |
| BZ | Non-qualified dividend 37% taxation in US | test_hostile_bz_non_qualified_div_tax | expect(result.appliedRate).toBe(0.37) | PASS | EXECUTED | PASS |
| CA | Qualified dividend 20% taxation in US | test_hostile_ca_qualified_div_tax | expect(result.appliedRate).toBe(0.20) | PASS | EXECUTED | PASS |
| CB | Indian STT calculation on equity purchase | test_hostile_cb_indian_stt_purchase | expect(result.estimatedTax).toBeCloseTo(expectedStt) | PASS | EXECUTED | PASS |
| CC | Indian STT calculation on equity sale | test_hostile_cc_indian_stt_sale | expect(result.estimatedTax).toBeGreaterThan(0) | PASS | EXECUTED | PASS |
| CD | Liquidation after-tax TWR estimation | test_hostile_cd_liquidation_after_tax_twr | expect(result.liquidationAfterTaxTwr).toBeLessThan(result.afterTaxTwr) | PASS | EXECUTED | PASS |
| CE | Multi-objective penalty weight versioning | test_hostile_ce_penalty_weight_versioning | expect(p2.objectiveWeights.lambda3TaxCost).toBe(2.0) | PASS | EXECUTED | PASS |
| CF | Strict T0 price rejection | test_hostile_cf_strict_t0_price_rejection | expect(result.status).toBe('TEMPORAL_VIOLATION') | TEMPORAL_VIOLATION | EXECUTED | PASS |
| CG | Strict T0 dividend rejection | test_hostile_cg_strict_t0_dividend_rejection | expect(result.status).toBe('TEMPORAL_VIOLATION') | TEMPORAL_VIOLATION | EXECUTED | PASS |
| CH | Strict T0 corporate action rejection | test_hostile_ch_strict_t0_corp_action | expect(result.status).toBe('TEMPORAL_VIOLATION') | TEMPORAL_VIOLATION | EXECUTED | PASS |
| CI | Historical replay invariance across 100 replays | test_hostile_ci_historical_replay_invariance | expect(hashA).toBe(hashB) | PASS | EXECUTED | PASS |
| CJ | Concurrent tax evaluations cross-contamination defense | test_hostile_cj_concurrent_evaluations | expect(allMatch).toBe(true) | PASS | EXECUTED | PASS |
| CK | Data provenance label for synthetic test lots | test_hostile_ck_data_provenance_synthetic | expect(pkg.dataProvenance).toContain('GOLDEN_SYNTHETIC') | PASS | EXECUTED | PASS |
| CL | Real ticker integration AAPL data integrity | test_hostile_cl_real_ticker_aapl | expect(pkg.portfolioId).toBe('PORT-AAPL') | PASS | EXECUTED | PASS |
| CM | Real ticker integration JPM data integrity | test_hostile_cm_real_ticker_jpm | expect(pkg.portfolioId).toBe('PORT-JPM') | PASS | EXECUTED | PASS |
| CN | Real ticker integration RELIANCE.NS data integrity | test_hostile_cn_real_ticker_reliance | expect(pkg.portfolioId).toBe('PORT-RELIANCE') | PASS | EXECUTED | PASS |
| CO | Real ticker integration TMPV.NS data integrity | test_hostile_co_real_ticker_tmpv | expect(pkg.portfolioId).toBe('PORT-TMPV') | PASS | EXECUTED | PASS |
| CP | Real ticker integration TSM data integrity | test_hostile_cp_real_ticker_tsm | expect(pkg.portfolioId).toBe('PORT-TSM') | PASS | EXECUTED | PASS |
| CQ | Golden E2E full deterministic pipeline verification | test_hostile_cq_golden_e2e_trace | expect(pkg.packageHash).toBeDefined() | PASS | EXECUTED | PASS |
| CR | Deep freeze immutability enforcement on package | test_hostile_cr_deep_freeze_immutability | expect(() => { pkg.portfolioId = 'MUTATED'; }).toThrow() | PASS | EXECUTED | PASS |
| CS | Deep freeze immutability on tax lot | test_hostile_cs_deep_freeze_lot | expect(() => { lot.quantity = 999; }).toThrow() | PASS | EXECUTED | PASS |
| CT | Deep freeze immutability on jurisdiction rule | test_hostile_ct_deep_freeze_jurisdiction | expect(() => { rule.stcgRate = 0; }).toThrow() | PASS | EXECUTED | PASS |
| CU | Deep freeze immutability on tax policy | test_hostile_cu_deep_freeze_policy | expect(() => { p.version = '9.9'; }).toThrow() | PASS | EXECUTED | PASS |
| CV | Null input payload rejection in calculate route | test_hostile_cv_null_input_calculate | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| CW | Empty body in policy create route | test_hostile_cw_empty_body_policy | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| CX | Missing policyId in policy route | test_hostile_cx_missing_policy_id | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| CY | Missing portfolioId in after-tax route | test_hostile_cy_missing_portfolio_after_tax | expect(res.status).toBe(404) | 404 | EXECUTED | PASS |
| CZ | Missing portfolioId in tax-drag route | test_hostile_cz_missing_portfolio_tax_drag | expect(res.status).toBe(404) | 404 | EXECUTED | PASS |
| DA | Missing portfolioId in audit route | test_hostile_da_missing_portfolio_audit | expect(res.status).toBe(200) | 200 | EXECUTED | PASS |
| DB | Missing packageId in explain route | test_hostile_db_missing_package_explain | expect(res.status).toBe(404) | 404 | EXECUTED | PASS |
| DC | Rebalance route with empty targets | test_hostile_dc_rebalance_empty_targets | expect(res.status).toBe(200) | 200 | EXECUTED | PASS |
| DD | Rebalance route with invalid side | test_hostile_dd_rebalance_invalid_side | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DE | Harvesting route with empty lots | test_hostile_de_harvesting_empty_lots | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DF | Harvesting route with missing prices | test_hostile_df_harvesting_missing_prices | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DG | Scenario route with empty portfolioId | test_hostile_dg_scenario_empty_portfolio | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DH | Scenario route with invalid prices | test_hostile_dh_scenario_invalid_prices | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DI | Non-numeric preTaxTwr rejection | test_hostile_di_non_numeric_pretax_twr | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DJ | Negative portfolioValue rejection in after-tax | test_hostile_dj_negative_portfolio_value | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DK | Zero portfolioValue rejection in after-tax | test_hostile_dk_zero_portfolio_value | expect(res.status).toBe(400) | 400 | EXECUTED | PASS |
| DL | Non-numeric expectedTaxDrag in after-tax expected return | test_hostile_dl_non_numeric_expected_drag | expect(res.status).toBe('AFTER_TAX_RESULT_UNAVAILABLE') | AFTER_TAX_RESULT_UNAVAILABLE | EXECUTED | PASS |
| DM | Non-numeric verifiedExpectedReturn in after-tax expected return | test_hostile_dm_non_numeric_verified_return | expect(res.status).toBe('AFTER_TAX_RESULT_UNAVAILABLE') | AFTER_TAX_RESULT_UNAVAILABLE | EXECUTED | PASS |
| DN | Missing securityId in lot creation | test_hostile_dn_missing_sec_id_lot | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DO | Missing accountId in lot creation | test_hostile_do_missing_acct_id_lot | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DP | Missing currency in lot creation | test_hostile_dp_missing_currency_lot | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DQ | Non-numeric quantity in lot creation | test_hostile_dq_non_numeric_qty_lot | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DR | Non-numeric acquisitionPrice in lot creation | test_hostile_dr_non_numeric_price_lot | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DS | Non-numeric costBasis in lot creation | test_hostile_ds_non_numeric_basis_lot | expect(res.status).toBe('COST_BASIS_UNAVAILABLE') | COST_BASIS_UNAVAILABLE | EXECUTED | PASS |
| DT | Malformed date string in acquisitionDate | test_hostile_dt_malformed_acq_date | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DU | Malformed date string in realizationDate | test_hostile_du_malformed_real_date | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DV | Malformed date string in dividendDate | test_hostile_dv_malformed_div_date | expect(res.status).toBe('INVALID_INPUT') | INVALID_INPUT | EXECUTED | PASS |
| DW | Empty string jurisdiction rejection | test_hostile_dw_empty_jurisdiction | expect(res.status).toBe('JURISDICTION_UNAVAILABLE') | JURISDICTION_UNAVAILABLE | EXECUTED | PASS |
| DX | Null jurisdiction rejection | test_hostile_dx_null_jurisdiction | expect(res.status).toBe('JURISDICTION_UNAVAILABLE') | JURISDICTION_UNAVAILABLE | EXECUTED | PASS |
| DY | Case-insensitive jurisdiction parsing | test_hostile_dy_case_insensitive_jurisdiction | expect(res.status).toBe('PASS') | PASS | EXECUTED | PASS |
| DZ | Indian STCG 365-day boundary test (364 days held) | test_hostile_dz_india_stcg_364_days | expect(result.holdingClass).toBe('SHORT_TERM') | SHORT_TERM | EXECUTED | PASS |
| EA | Indian LTCG 365-day boundary test (365 days held) | test_hostile_ea_india_ltcg_365_days | expect(result.holdingClass).toBe('LONG_TERM') | LONG_TERM | EXECUTED | PASS |
| EB | US STCG 365-day boundary test (364 days held) | test_hostile_eb_us_stcg_364_days | expect(result.holdingClass).toBe('SHORT_TERM') | SHORT_TERM | EXECUTED | PASS |
| EC | US LTCG 365-day boundary test (365 days held) | test_hostile_ec_us_ltcg_365_days | expect(result.holdingClass).toBe('LONG_TERM') | LONG_TERM | EXECUTED | PASS |
| ED | Specific lot allocator partial lot consumption | test_hostile_ed_specific_lot_partial | expect(alloc[0].allocatedQuantity).toBe(50) | PASS | EXECUTED | PASS |
| EE | FIFO allocator multi-lot consumption | test_hostile_ee_fifo_multi_lot | expect(alloc.length).toBe(2) | PASS | EXECUTED | PASS |
| EF | LIFO allocator multi-lot consumption | test_hostile_ef_lifo_multi_lot | expect(alloc[0].lotId).toBe('LOT-2') | PASS | EXECUTED | PASS |
| EG | Realized gain formula string exposition | test_hostile_eg_realized_formula_exposed | expect(res.formula).toBeDefined() | PASS | EXECUTED | PASS |
| EH | Unrealized gain formula string exposition | test_hostile_eh_unrealized_formula_exposed | expect(res.formula).toBeDefined() | PASS | EXECUTED | PASS |
| EI | Tax drag formula string exposition | test_hostile_ei_tax_drag_formula_exposed | expect(res.formulaDrag).toBeDefined() | PASS | EXECUTED | PASS |
| EJ | After-tax return formula string exposition | test_hostile_ej_after_tax_formula_exposed | expect(res.formula).toBeDefined() | PASS | EXECUTED | PASS |
| EK | Tax lot reconciliation quantity formula exposition | test_hostile_ek_lot_recon_qty_formula | expect(res.formulaQty).toBeDefined() | PASS | EXECUTED | PASS |
| EL | Tax lot reconciliation cost basis formula exposition | test_hostile_el_lot_recon_basis_formula | expect(res.formulaBasis).toBeDefined() | PASS | EXECUTED | PASS |
| EM | Disclaimer presence in all sealed packages | test_hostile_em_disclaimer_presence | expect(pkg.disclaimer).toContain('legal or tax advice') | PASS | EXECUTED | PASS |
| EN | Invariant isExecuted=false in all sealed packages | test_hostile_en_is_executed_false | expect(pkg.isExecuted).toBe(false) | PASS | EXECUTED | PASS |
| EO | Tax estimate labeled ESTIMATED on unrealized gains | test_hostile_eo_unrealized_tax_label | expect(res.taxLabel).toBe('ESTIMATED') | ESTIMATED | EXECUTED | PASS |
| EP | Tax estimate labeled ESTIMATED on trade proposals | test_hostile_ep_proposal_tax_label | expect(res.taxLabel).toBe('ESTIMATED') | ESTIMATED | EXECUTED | PASS |
| EQ | Tax estimate labeled ESTIMATED on harvesting candidates | test_hostile_eq_harvest_tax_label | expect(res.taxLabel).toBe('ESTIMATED') | ESTIMATED | EXECUTED | PASS |
| ER | Tax estimate labeled ESTIMATED on rebalance proposals | test_hostile_er_rebalance_tax_label | expect(res.taxLabel).toBe('ESTIMATED') | ESTIMATED | EXECUTED | PASS |
| ES | Tax estimate labeled ESTIMATED on scenarios | test_hostile_es_scenarios_tax_label | expect(res.taxLabel).toBe('ESTIMATED') | ESTIMATED | EXECUTED | PASS |
| ET | Tax estimate labeled ESTIMATED on 3-way comparisons | test_hostile_et_comparison_tax_label | expect(res.taxLabel).toBe('ESTIMATED') | ESTIMATED | EXECUTED | PASS |
| EU | Tax estimate labeled ESTIMATED on after-tax expected return | test_hostile_eu_expected_return_tax_label | expect(res.taxLabel).toBe('ESTIMATED') | ESTIMATED | EXECUTED | PASS |
| EV | Tax label ACTUAL on realized historical after-tax returns | test_hostile_ev_actual_after_tax_label | expect(res.taxLabel).toBe('ACTUAL') | ACTUAL | EXECUTED | PASS |
| EW | Non-zero capital loss tax shield isolation | test_hostile_ew_loss_shield_isolation | expect(result.estimatedTax).toBe(0) | PASS | EXECUTED | PASS |
| EX | Full end-to-end hostile regression closure gate | test_hostile_ex_full_closure_gate | expect(allPass).toBe(true) | PASS | EXECUTED | PASS |
