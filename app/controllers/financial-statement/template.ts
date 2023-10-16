import { stripIndent } from 'common-tags';
import dayjs from 'dayjs';

import type { AuditData } from '../audit-output';

export type Template = {
  header: string;
  body: string;
} | null;

//
// Organization
//
export function organization1(data: AuditData): Template {
  const { businessName, description } = data.requests.BASIC_INFO;
  return {
    header: 'Description of Business',
    body: stripIndent`
      [${businessName}]. (the “Company”) was incorporated in the [State of Delaware] on [November 18, 2020]. [${description}]. [The Company has wholly owned subsidiaries], [SUBSIDIARY 1], [SUBSIDIARY 2].
    `,
  };
}

export function organization2(data: AuditData): Template {
  const dateEnd = dayjs(data.requests.AUDIT_INFO.fiscalYearEnd).format(
    'MMMM D, YYYY',
  );
  return {
    header: 'Going Concern and Liquidity',
    body: stripIndent`
      The Company has incurred recurring losses and negative cash flows from operating activities since inception. As of [${dateEnd}], the Company had cash of [number] and an accumulated deficit of [number]. In [March 2023], the Company issued [number] shares of Series B-1 convertible preferred stock for proceeds of approximately [number]. In addition, the convertible notes with aggregate outstanding principal of [number] were converted into [number] shares of Series B-1 convertible preferred stock. In April 2023, the Company closed a subsequent round of Series B-1 convertible preferred stock for additional proceeds of $10,800,000 and issuance of [number] Series B-1 convertible preferred shares. Based on the Company's forecasts, the Company's current resources and cash balance are sufficient to enable the Company to continue as a going concern for 12 months from the date these consolidated financial statements are available to be issued.

      The ability to continue as a going concern is dependent upon the Company obtaining necessary financing to meet its obligations and repay its liabilities arising from normal business operations when they come due. The Company may raise additional capital through the issuance of equity securities, debt financings or other sources in order to further implement its business plan. However, if such financing is not available when needed and at adequate levels, the Company will need to reevaluate its operating plan and may be required to delay the development of its products.
    `,
  };
}

//
// Summary of Significant Accounting Policies
// See source at https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=999975059
//
export function summarySigAccountPractices1(data: AuditData): Template {
  return {
    header: 'Basis of Presentation',
    body: stripIndent`
      The accompanying consolidated financial statements, which include the accounts of the Company and its wholly owned subsidiaries, have been prepared in conformity with accounting principles generally accepted in the United States of America (“US GAAP”). All significant intercompany transactions and balances have been eliminated in consolidation.
    `,
  };
}

export function summarySigAccountPractices2(data: AuditData): Template {
  const dateEnd = dayjs(data.requests.AUDIT_INFO.fiscalYearEnd).format(
    'MMMM D, YYYY',
  );
  return {
    header: 'Foreign Currencies',
    body: stripIndent`
      Gains and losses resulting from foreign currency transactions are included in other income, net within the consolidated statement of operations. For the year ended ${dateEnd}, the impact from foreign currency transactions was immaterial.
    `,
  };
}

export function summarySigAccountPractices3(data: AuditData): Template {
  return {
    header: 'Use of Estimates',
    body: stripIndent`
      The preparation of multiple consolidated financial statements in conformity with Global GAAP requires the Company to make estimates, judgments, and various assumptions that affect the reported amounts of assets, liabilities, expenses and the amounts disclosed in the related notes to the consolidated financial statements. Significant estimates and assumptions used in these consolidated financial statements include, but are not limited to, useful lives and recoverability of long-lived assets, the fair value of the Company's common stock, the fair value of derivative liability, stock-based compensation and the accounting for income taxes and related valuation allowances. The Company evaluates its estimates and assumptions on an ongoing basis using historical experience and other factors and adjusts those estimates and assumptions when facts and circumstances dictate. Actual results could materially differ from those estimates.
`,
  };
}

export function summarySigAccountPractices4(data: AuditData): Template {
  return {
    header: 'Concentration of Credit Risk and Other Risks and Uncertainties',
    body: stripIndent`
      Financial instruments that potentially subject the Company to credit risk consist principally of cash held by financial institutions. Substantially all of the Company's cash is held at one financial institution that management believes is of high credit quality. Such deposits may, at times, exceed federally insured limits.

      The Company is dependent on key suppliers for certain laboratory materials. An interruption in the supply of these materials would temporarily impact the Company's ability to perform development and testing related to its products.
    `,
  };
}

export function summarySigAccountPractices5(data: AuditData): Template {
  return {
    header: 'Fair Value Measurements',
    body: stripIndent`
      The carrying value of the Company's cash, prepaid expenses and other current assets, accounts payable and  accrued liabilities approximate fair value due to the short-term nature of these items.

      Fair value is defined as the exchange price that would be received for an asset or an exit price paid to transfer a liability in the principal or most advantageous market for the asset or liability in an orderly transaction between market participants on the measurement date.

      Valuation techniques used to measure fair value must maximize the use of observable inputs and minimize the use of unobservable inputs.

      The fair value hierarchy defines a three-level valuation hierarchy for disclosure of fair value measurements as follows:

        •	 	Level 1—Unadjusted quoted prices in active markets for identical assets or liabilities;

        •	 	Level 2—Inputs other than quoted prices included within Level 1 that are observable, unadjusted quoted prices in markets that are not active, or other inputs that are observable or can be corroborated by observable market data for substantially the full term of the related assets or liabilities; and

        •	 	Level 3—Unobservable inputs that are supported by little or no market activity for the related assets or liabilities.


      The categorization of a financial instrument within the valuation hierarchy is based upon the lowest level of input that is significant to the fair value measurement.

      The Company's derivative liability is measured at fair value on a recurring basis and are classified as Level 3 liabilities. The Company records subsequent adjustments to reflect the increase or decrease in estimated fair value at each reporting date in current period earnings.
    `,
  };
}

export function summarySigAccountPractices6(data: AuditData): Template {
  return {
    header: 'Cash',
    body: stripIndent`
      The Company considers highly liquid investments purchased with a remaining maturity date upon acquisition of three months or less to be cash equivalents and are stated at cost, which approximates fair value. As of [insert fiscal year end], there were no cash equivalents.
    `,
  };
}

export function summarySigAccountPractices7(data: AuditData): Template {
  //[If the trial balance has a field referencing "fixed assets']
  // return null
  return {
    header: 'Property and Equipment',
    body: stripIndent`
      Property and equipment are stated at cost, net of depreciation. Depreciation is computed using the straight-line method over the estimated useful lives of the assets. Leasehold improvements are amortized on a straight-line basis over the lesser of the estimated useful life of the asset or the remaining term of the related lease. Maintenance and repairs are charged to expense as incurred, and improvements and betterments are capitalized.

      When assets are retired or otherwise disposed of, the cost and accumulated depreciation are removed from the balance sheet and any resulting gain or loss is reflected in other income or expense in the statement of operations in the period realized.

      The useful lives of property and equipment are:

      [TODO]
      Asset
      Furniture and fixtures
      Machinery and equipment
      Leasehold improvements
      Useful Life (Years)
      3
      3 – 10
      Remaining life of the lease
    `,
  };
}

export function summarySigAccountPractices8(data: AuditData): Template {
  //[If the trial balance has a field referencing "intangible assets']
  // return null
  return {
    header: 'Intangible Assets',
    body: stripIndent`
      Intangible assets consist of patents and are stated at cost, net of amortization. Amortization is computed using the straight-line method over an estimated useful life of approximately five to seventeen years.
    `,
  };
}

export function summarySigAccountPractices9(data: AuditData): Template {
  //[If answered yes to leases in questionnaire AND if answered yes to having ASC 842 analsys]
  // return null
  return {
    header: 'Leases',
    body: stripIndent`
    The Company determines if an arrangement is a lease at inception and if so, determines whether the lease qualifies as operating or finance. Operating leases are included in operating lease right-of-use (“ROU”) assets and operating lease liabilities in the consolidated balance sheet. The Company does not have any finance leases as of [insert fiscal year end, 20XX].

    ROU assets represent the right to use an underlying asset for the lease term and lease liabilities represent the obligation to make lease payments arising from the lease. ROU assets are calculated and recognized at lease commencement date based on the present value of lease payments over the lease term adjusted for any lease payments paid to the lessor at or before the commencement date and initial direct costs incurred by the Company and excludes any lease incentives received from the lessor. When the implicit rate is not readily available, the Company has made an accounting policy election to use to the risk-free rate to determine the present value of lease payments for its property leases. The Company's lease terms may include options to extend or terminate the lease when it is reasonably certain that it will exercise that option.

    Lease expense for lease payments is recognized on a straight-line basis over the lease term. The Company has elected not to recognize ROU asset and lease obligations for its short-term leases, which are defined as leases with an initial term of 12 months or less. The Company elected to not separate lease and non-lease components for all of its property leases. For leases in which the lease and non-lease components have been combined, the variable lease expense includes expenses such as common area maintenance, utilities, repairs and maintenance and are expensed as incurred.
    `,
  };
}

export function summarySigAccountPractices10(data: AuditData): Template {
  //[If answered yes to leases in questionnaire AND if answered yes to having ASC 842 analsys]
  // return null
  return {
    header: 'Impairment of Long-Lived Assets',
    body: stripIndent`
      The Company periodically evaluates the recoverability of its long-lived assets that include property and equipment, intangible assets and ROU assets for impairment whenever events or changes in circumstances indicate that the carrying amount of an asset may not be recoverable. Recoverability is measured by comparison of the carrying amount to the future net cash flows, which the assets are expected to generate. If such assets are considered to be impaired, the impairment to be recognized is measured by the amount by which the carrying amount of the assets exceeds the projected discounted future net cash flows arising from the asset. No impairment loss was recognized for the year ended [insert fiscal year end, 20XX].
    `,
  };
}

export function summarySigAccountPractices11(data: AuditData): Template {
  //[if there's a field called "research and development" from the trial balance]
  // return null
  return {
    header: 'Research and Development',
    body: stripIndent`
      Costs associated with research and development activities are expensed as incurred and include, but are not limited to, personnel-related expenses including stock-based compensation expense, materials, laboratory supplies, consulting costs, and allocated overhead including rent and utilities.
    `,
  };
}

export function summarySigAccountPractices12(data: AuditData): Template {
  //[if there's a field called "marketing" or "advertising" from the trial balance]
  // return null
  return {
    header: 'Advertising and Marketing Costs',
    body: stripIndent`
      Costs associated with advertising and marketing activities are expensed as incurred. Total advertising and marketing costs amounted to [marketing cost, $XX,XXX] for the year ended [insert fiscal year end, 20XX] and are included in general and administrative expenses in the consolidated statement of operations.
    `,
  };
}

export function summarySigAccountPractices13(data: AuditData): Template {
  //[if answered yes to "if the company isssued stock to employees"]
  // return null
  return {
    header: 'Stock-Based Compensation',
    body: stripIndent`
      The Company estimates the fair value of stock based payment awards on the date of grant using the Black Scholes Merton option pricing model. The model requires management to make a number of assumptions, including the fair value of the Company's common stock, expected volatility, expected life, risk free interest rate and expected dividends. The value of awards that are ultimately expected to vest is recognized ratably over the requisite service periods in the Company's consolidated statement of operations. Forfeitures are accounted for as they occur.
    `,
  };
}

export function summarySigAccountPractices14(data: AuditData): Template {
  return {
    header: 'Income Taxes',
    body: stripIndent`
      The Company accounts for income taxes using the liability method whereby deferred tax asset and liability account balances are determined based on differences between the financial reporting and tax basis of assets and liabilities and are measured using the enacted tax rates and laws that will be in effect when the differences are expected to reverse. The Company provides a valuation allowance, if necessary, to reduce deferred tax assets to their estimated realizable value.

      In evaluating the ability to recover its deferred income tax assets, the Company considers all available positive and negative evidence, including its operating results, ongoing tax planning, and forecasts of future taxable income on a jurisdiction-by-jurisdiction basis. In the event the Company determines that it would be able to realize its deferred income tax assets in the future in excess of their net recorded amount, it would make an adjustment to the valuation allowance that would reduce the provision for income taxes. Conversely, in the event that all or part of the net deferred tax assets are determined not to be realizable in the future, an adjustment to the valuation allowance would be charged to earnings in the period such determination is made.

      It is the Company's policy to include penalties and interest expense related to income taxes as a component of other expense and interest expense, respectively, as necessary.
    `,
  };
}

export function summarySigAccountPractices15(data: AuditData): Template {
  return {
    header: 'Recent Accounting Pronouncements',
    body: stripIndent`
      From time to time, new accounting pronouncements, or Accounting Standard Updates (“ASU”) are issued by the Financial Accounting Standards Board (“FASB”), or other standard setting bodies and adopted by the Company as of the specified effective date. Unless otherwise discussed, the impact of recently issued standards that are not yet effective will not have a material impact on the Company's financial position or results of operations upon adoption.
    `,
  };
}

export function summarySigAccountPractices16(data: AuditData): Template {
  // See https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=999975059&range=A79
  return {
    header: 'Recently Adopted Accounting Pronouncements',
    body: stripIndent`
    [if there answered yes to the questionnaire prompt of "did the company perform an 842 analysis?"]
    In February 2016, the FASB issued ASU No. 2016-02, Leases (Topic 842), (“ASC 842”). The amendments in this update increase transparency and comparability among organizations by recognizing lease assets and lease liabilities on the balance sheet and disclosing key information about leasing arrangements. The amendments in this update are effective for private entities for fiscal years beginning after [insert year inputted in ASC 842 question, year 20XX].
    [End if]

    [if there answered yes to the questionnaire prompt of "did the company perform an 842 analysis?"]
    The Company adopted ASC 842 using the cumulative effect adjustment approach as of [insert year inputted in ASC 842 question, year 20XX]. The Company elected the package of practical expedients permitted under the transition guidance within ASC 842, which allowed the Company to carry forward the historical lease classification, retain the initial direct costs for any leases that existed prior to the adoption of the standard and not reassess whether any contracts entered into prior to the adoption are leases. The Company did not elect the hindsight practical expedient to reassess the lease term for leases within the Company's lease population.
    [End if]

    [if there answered yes to the questionnaire prompt of "did the company perform an 842 analysis?"]
    Upon adoption, the Company recognized operating lease right-of-use assets of [insert right of use from trial balance] and operating lease liabilities of [insert lease liabilities from trial balance] . In addition, the Company reclassified deferred rent of [number]. There was no cumulative-effect adjustment to the opening balance of retained earnings from the adoption of ASC 842. The additional disclosures required by the new standard have been included in Note 2, “Summary of  Significant Accounting Policies” and Note 5, “Leases.”
    [End if]
    `,
  };
}
