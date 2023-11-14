import dayjs from 'dayjs';
import dedent from 'dedent';

import { ppCurrency } from '@/lib/util';

import type { AuditData } from '../audit-output';

function toDate(date: any) {
  return dayjs(date).format('MMMM D, YYYY');
}

export type Template = {
  header: string;
  body: string;
} | null;

export type Section = {
  header: string;
  isShowing: (data: AuditData) => boolean;
  slug: string;
  body: (data: AuditData) => string;
  pageBreakBefore: boolean;
};

function generateSection({
  header,
  isShowing = () => true,
  body,
  pageBreakBefore = false,
}: {
  header: string;
  isShowing?: (data: AuditData) => boolean;
  body: (data: AuditData) => string;
  pageBreakBefore?: boolean;
}): Section {
  return {
    header,
    isShowing,
    slug: header.toLowerCase().replace(/ /g, '-'),
    body,
    pageBreakBefore,
  };
}

export function sectionsToBody<T>(
  sections: Section[],
  data: AuditData,
  wrapper: ({
    header,
    body,
    pageBreakBefore = false,
  }: {
    header: string;
    body: string;
    pageBreakBefore: boolean;
  }) => T[],
) {
  const ret = [];
  for (const s in sections) {
    if (sections[s].isShowing(data)) {
      ret.push(
        ...wrapper({
          header: sections[s].header,
          body: dedent(sections[s].body(data)),
          pageBreakBefore: sections[s].pageBreakBefore,
        }),
      );
    }
  }
  return ret;
}

export const getOrganizationSections = () => [
  generateSection({
    header: 'Description of Business',
    body: (data) => `
      [${
        data.basicInfo.businessName
      }]. (the “Company”) was incorporated in the State of [${
        data.articlesOfIncorporation.incorporationJurisdiction
      }] on [${toDate(data.articlesOfIncorporation.incorporationDate)}]. [${
        data.basicInfo.description
      }]. [TODO: The Company has wholly owned subsidiaries], [SUBSIDIARY 1, SUBSIDIARY 2...].
    `,
  }),

  generateSection({
    header: 'Going Concern and Liquidity',
    body: (data) => `
      The Company has incurred recurring losses and negative cash flows from operating activities since inception. As of [${
        data.fiscalYearEnd
      }], the Company had cash of [${ppCurrency(
        data.balanceSheet.assets.currentAssets.cash,
      )}] and an accumulated deficit of [${ppCurrency(
        data.balanceSheet.liabilities.totalCurrent,
      )}]. Based on the Company’s forecasts, the Company’s current resources and cash balance are sufficient to enable the Company to continue as a going concern for 12 months from the date these consolidated financial statements are available to be issued.

      The ability to continue as a going concern is dependent upon the Company obtaining necessary financing to meet its obligations and repay its liabilities arising from normal business operations when they come due. The Company may raise additional capital through the issuance of equity securities, debt financings or other sources in order to further implement its business plan. However, if such financing is not available when needed and at adequate levels, the Company will need to reevaluate its operating plan and may be required to delay the development of its products.
    `,
  }),
];

export const getPolicySections = () => [
  generateSection({
    header: 'Basis of Presentation',
    body: (data) => `
      The accompanying consolidated financial statements, which include the accounts of the Company and its wholly owned subsidiaries, have been prepared in conformity with accounting principles generally accepted in the United States of America (“US GAAP”). All significant intercompany transactions and balances have been eliminated in consolidation.
    `,
  }),

  generateSection({
    header: 'Foreign Currencies',
    body: (data) => `
      Gains and losses resulting from foreign currency transactions are included in other income, net within the consolidated statement of operations. For the year ended [${data.fiscalYearEnd}], the impact from foreign currency transactions was immaterial.
    `,
  }),
  generateSection({
    header: 'Use of Estimates',
    body: (data) => `
      The preparation of consolidated financial statements in conformity with US GAAP requires the Company to make estimates, judgments, and assumptions that affect the reported amounts of assets, liabilities, expenses, and the amounts disclosed in the related notes to the consolidated financial statements. Significant estimates and assumptions used in these consolidated financial statements include, but are not limited to, useful lives and recoverability of long-lived assets, the fair value of the Company's common stock, the fair value of derivative liability, stock-based compensation and the accounting for income taxes and related valuation allowances. The Company evaluates its estimates and assumptions on an ongoing basis using historical experience and other factors and adjusts those estimates and assumptions when facts and circumstances dictate. Actual results could materially differ from those estimates.
    `,
  }),
  generateSection({
    header: 'Concentration of Credit Risk and Other Risks and Uncertainties',
    body: (data) => `
      Financial instruments that potentially subject the Company to credit risk consist principally of cash held by financial institutions. Substantially all of the Company's cash is held at one financial institution that management believes is of high credit quality. Such deposits may, at times, exceed federally insured limits.

      The Company is dependent on key suppCurrencyliers for certain laboratory materials. An interruption in the suppCurrencyly of these materials would temporarily impact the Company's ability to perform development and testing related to its products.
    `,
  }),
  generateSection({
    header: 'Fair Value Measurements',
    body: (data) => `
      The carrying value of the Company's cash, prepaid expenses and other current assets, accounts payable and accrued liabilities approximate fair value due to the short-term nature of these items.

      Fair value is defined as the exchange price that would be received for an asset or an exit price paid to transfer a liability in the principal or most advantageous market for the asset or liability in an orderly transaction between market participants on the measurement date.

      Valuation techniques used to measure fair value must maximize the use of observable inputs and minimize the use of unobservable inputs.

      The fair value hierarchy defines a three-level valuation hierarchy for disclosure of fair value measurements as follows:

          • Level 1 - Unadjusted quoted prices in active markets for identical assets or liabilities;
          • Level 2 - Inputs other than quoted prices included within Level 1 that are observable, unadjusted quoted prices in markets that are not active, or other inputs that are observable or can be corroborated by observable market data for substantially the full term of the related assets or liabilities; and
          • Level 3 - Unobservable inputs that are supported by little or no market activity for the related assets or liabilities.

      The categorization of a financial instrument within the valuation hierarchy is based upon the lowest level of input that is significant to the fair value measurement.

      The Company's derivative liability is measured at fair value on a recurring basis and are classified as Level 3 liabilities. The Company records subsequent adjustments to reflect the increase or decrease in estimated fair value at each reporting date in current period earnings.
    `,
  }),
  generateSection({
    header: 'Cash',
    body: (data) => `
      The Company considers highly liquid investments purchased with a remaining maturity date upon acquisition of three months or less to be cash equivalents and are stated at cost, which approximates fair value. As of [${data.fiscalYearEnd}], there were no cash equivalents.
    `,
  }),
  generateSection({
    header: 'Property and Equipment',
    isShowing: (data) => true, // [no show If the trial balance has a field referencing "fixed assets']
    body: (data) => `
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
  }),
  generateSection({
    header: 'Intangible Assets',
    isShowing: (data) => true, // [If the trial balance has a field referencing "intangible assets']
    body: (data) => `
      Intangible assets consist of patents and are stated at cost, net of amortization. Amortization is computed using the straight-line method over an estimated useful life of approximately five to seventeen years.
    `,
  }),
  generateSection({
    header: 'Leases',
    isShowing: (data) =>
      data.leases.hasLeases && data.leases.didPerformASC842Analysis,
    body: (data) => `
      The Company determines if an arrangement is a lease at inception and if so, determines whether the lease qualifies as operating or finance. Operating leases are included in operating lease right-of-use (“ROU”) assets and operating lease liabilities in the consolidated balance sheet. The Company does not have any finance leases as of [${data.fiscalYearEnd}].

      ROU assets represent the right to use an underlying asset for the lease term and lease liabilities represent the obligation to make lease payments arising from the lease. ROU assets are calculated and recognized at lease commencement date based on the present value of lease payments over the lease term adjusted for any lease payments paid to the lessor at or before the commencement date and initial direct costs incurred by the Company and excludes any lease incentives received from the lessor. When the implicit rate is not readily available, the Company has made an accounting policy election to use to the risk-free rate to determine the present value of lease payments for its property leases. The Company's lease terms may include options to extend or terminate the lease when it is reasonably certain that it will exercise that option.

      Lease expense for lease payments is recognized on a straight-line basis over the lease term. The Company has elected not to recognize ROU asset and lease obligations for its short-term leases, which are defined as leases with an initial term of 12 months or less. The Company elected to not separate lease and non-lease components for all of its property leases. For leases in which the lease and non-lease components have been combined, the variable lease expense includes expenses such as common area maintenance, utilities, repairs and maintenance and are expensed as incurred.
    `,
  }),
  generateSection({
    header: 'Impairment of Long-Lived Assets',
    isShowing: (data) =>
      data.leases.hasLeases && data.leases.didPerformASC842Analysis,
    body: (data) => `
      The Company periodically evaluates the recoverability of its long-lived assets that include property and equipment, intangible assets and ROU assets for impairment whenever events or changes in circumstances indicate that the carrying amount of an asset may not be recoverable. Recoverability is measured by comparison of the carrying amount to the future net cash flows, which the assets are expected to generate. If such assets are considered to be impaired, the impairment to be recognized is measured by the amount by which the carrying amount of the assets exceeds the projected discounted future net cash flows arising from the asset. No impairment loss was recognized for the year ended [${data.fiscalYearEnd}].
    `,
  }),
  generateSection({
    header: 'Research and Development',
    isShowing: (data) => true, // [if there's a field called "research and development" from the trial balance]
    body: (data) => `
      Costs associated with research and development activities are expensed as incurred and include, but are not limited to, personnel-related expenses including stock-based compensation expense, materials, laboratory supplies, consulting costs, and allocated overhead including rent and utilities.
    `,
  }),
  generateSection({
    header: 'Advertising and Marketing Costs',
    isShowing: (data) => true, // [if there's a field called "marketing" or "advertising" from the trial balance]
    body: (data) => `
      Costs associated with advertising and marketing activities are expensed as incurred. Total advertising and marketing costs amounted to [marketing cost, $XX,XXX] for the year ended [${data.fiscalYearEnd}] and are included in general and administrative expenses in the consolidated statement of operations.
    `,
  }),
  generateSection({
    header: 'Stock-Based Compensation',
    isShowing: (data) => data.equity.hasEmployeeStockPlan,
    body: (data) => `
      The Company estimates the fair value of stock based payment awards on the date of grant using the Black Scholes Merton option pricing model. The model requires management to make a number of assumptions, including the fair value of the Company's common stock, expected volatility, expected life, risk free interest rate and expected dividends. The value of awards that are ultimately expected to vest is recognized ratably over the requisite service periods in the Company's consolidated statement of operations. Forfeitures are accounted for as they occur.
    `,
  }),
  generateSection({
    header: 'Income Taxes',
    body: (data) => `
      The Company accounts for income taxes using the liability method whereby deferred tax asset and liability account balances are determined based on differences between the financial reporting and tax basis of assets and liabilities and are measured using the enacted tax rates and laws that will be in effect when the differences are expected to reverse. The Company provides a valuation allowance, if necessary, to reduce deferred tax assets to their estimated realizable value.

      In evaluating the ability to recover its deferred income tax assets, the Company considers all available positive and negative evidence, including its operating results, ongoing tax planning, and forecasts of future taxable income on a jurisdiction-by-jurisdiction basis. In the event the Company determines that it would be able to realize its deferred income tax assets in the future in excess of their net recorded amount, it would make an adjustment to the valuation allowance that would reduce the provision for income taxes. Conversely, in the event that all or part of the net deferred tax assets are determined not to be realizable in the future, an adjustment to the valuation allowance would be charged to earnings in the period such determination is made.

      It is the Company's policy to include penalties and interest expense related to income taxes as a component of other expense and interest expense, respectively, as necessary.
    `,
  }),
  generateSection({
    header: 'Recent Accounting Pronouncements',
    body: (data) => `
      From time to time, new accounting pronouncements, or Accounting Standard Updates (“ASU”) are issued by the Financial Accounting Standards Board (“FASB”), or other standard setting bodies and adopted by the Company as of the specified effective date. Unless otherwise discussed, the impact of recently issued standards that are not yet effective will not have a material impact on the Company's financial position or results of operations upon adoption.
    `,
  }),
  generateSection({
    header: 'Recently Adopted Accounting Pronouncements',
    isShowing: (data) => data.leases.didPerformASC842Analysis,
    body: (data) => `
      In February 2016, the FASB issued ASU No. 2016-02, Leases (Topic 842), (“ASC 842”). The amendments in this update increase transparency and comparability among organizations by recognizing lease assets and lease liabilities on the balance sheet and disclosing key information about leasing arrangements. The amendments in this update are effective for private entities for fiscal years beginning after [${data.leases.yearOfASC842Analysis}].

      The Company adopted ASC 842 using the cumulative effect adjustment approach as of [${data.leases.yearOfASC842Analysis}]. The Company elected the package of practical expedients permitted under the transition guidance within ASC 842, which allowed the Company to carry forward the historical lease classification, retain the initial direct costs for any leases that existed prior to the adoption of the standard and not reassess whether any contracts entered into prior to the adoption are leases. The Company did not elect the hindsight practical expedient to reassess the lease term for leases within the Company's lease population.

      Upon adoption, the Company recognized operating lease right-of-use assets of [insert right of use from trial balance] and operating lease liabilities of [insert lease liabilities from trial balance] . In addition, the Company reclassified deferred rent of [number]. There was no cumulative-effect adjustment to the opening balance of retained earnings from the adoption of ASC 842. The additional disclosures required by the new standard have been included in Note 2, “Summary of  Significant Accounting Policies” and Note 5, “Leases.”
    `,
  }),
  generateSection({
    header: 'Fair Value Measurements',
    isShowing: (data) => data.leases.didPerformASC842Analysis,
    body: (data) => `
      The following tables summarize the Company’s financial liabilities measured at fair value on a recurring basis by level within the fair value hierarchy as of [insert December 31, 2022]:

      [TABLE https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=2072488138&range=A6]

      The Company’s derivative liability relates to the Redemption Feature which is bifurcated from convertible notes. The valuation of the Company’s derivative liability contains unobservable inputs that reflect the Company’s own assumptions for which there is little, if any, market activity for at the measurement date. Accordingly, the Company’s derivative liability is measured at fair value on a recurring basis using unobservable inputs and is classified as Level 3 inputs, and any change in fair value is recognized as a component of other income (expense), net in the statement of operations.

      In order to determine the fair value of the derivative liability, the Company utilized an ___ approach model based on a probability weighted with-and-without perspective as of the issuance date and December 31, 2022. Under this method, the fair value of debt instrument is measured with the redemption features and without the redemption features and the difference is the implied fair value. The income approach model incorporates assumptions and estimates to value the redemption feature. Estimates and assumptions impacting the fair value measurement include the probabilities of a Qualified or Non-Qualified Financing taking place, the estimated term remaining until the triggering event takes place, and the discount rate. The Company utilized the following assumptions at valuation dates: 

      [TABLE https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=2072488138&range=A12]
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Property and equipment, net',
    isShowing: (data) => data.leases.didPerformASC842Analysis,
    body: (data) => `
      [TABLE] https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=586543814&range=A4
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Leases',
    isShowing: (data) => data.leases.didPerformASC842Analysis,
    body: (data) => `
      [TABLE] https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=406550412&range=A2
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Convertible Note Payable',
    isShowing: (data) => true, // [if there answered there's a field called "convertible note" on the trial balance"]
    body: (data) => `
      [if there answered there's a field called "convertible note" on the trial balance"] Note - this will also prompt the user to upload the equity/debt deal

      On [insert issue date of contract, Month, Day, Year (i.e. December 31, 2023)], the Company entered into [Type of Financing Document]  (the “[Type of Financing Document]”) with several lenders (the “Lenders”). The Lenders provided the Company an aggregate cash consideration of [aggregate amount raised, $XX,XXX], net of issuance costs of [provided by the company]. The [Type of Financing Document] accrue interest at [insert annual insert rate] per annum, which is accrued on the note balance. All unpaid interest and principal are due and payable upon maturity on [insert maturity date, Month, Day, Year (i.e. December 31, 2023] (“Maturity Date”). In addition, at the election of the holders of a majority of the outstanding principal amount of the [Type of Financing Document], the outstanding principal balance of the [Type of Financing Document] is convertible at any time after the Maturity Date into shares of the Company’s Series A preferred stock at a conversion price equal to [number] per share.

      Pursuant to the terms of the Convertible Notes, the outstanding principal balance is automatically convertible into equity shares in the next preferred equity financing round of at least [number] (“Qualified Financing”) at a price per share equal to [number] of the per share price paid for preferred equity shares by investors in the Qualified Financing. If the next preferred equity financing is not a Qualified Financing (“Non-Qualified Financing”), the holders of a majority of the outstanding principal amount of the Convertible Notes have the option to convert the outstanding principal balance into preferred equity shares issued in the Non-Qualified Financing at a price per share equal to [number] of the per share price paid for preferred equity shares by investors in the Non-Qualified Financing. In addition, if the Company consummated a change of control, firm commitment underwritten initial public offering of the Company’s common stock or a merger, consolidation or share exchange transaction with a publicly traded special purpose acquisition company or its subsidiary (each, a

      “Triggering Transaction”), the holders of a majority of the outstanding principal amount of the Convertible Notes will have the option to, either (i) require the Company to redeem all Convertible Notes at [number] of the outstanding principal amount, or (ii) (x) convert such outstanding principal amount into the common stock of the Company, at a conversion price per share equating to 90% of (A) the price per share paid to the holders of common stock of the Company in connection with such Triggering Transaction or (B) if no cash consideration is paid to the holders of common stock of the Company in connection with such Triggering Transaction, the value per share of common stock implied in such Triggering Transaction, or (y) in lieu of conversion, receive the consideration which would have been paid or received for such converted shares of common stock had such conversion been made immediately prior to such Triggering Transaction.

      Upon conversion of the Convertible Notes, all accrued and unpaid interest shall be deemed to have been waived by the note holders.

      The Company evaluated whether the Convertible Notes contain embedded features that meet the definition of derivatives under ASC 815, Derivatives and Hedging. The redemption features qualify as derivatives as they continuously reset as the underlying stock price increases or decreases so as to provide a variable number of shares for a fixed value of equity or provide a fixed repayment premium to the holders at any conversion date. Thus, the embedded redemption features were bifurcated and accounted for as a single derivative liability to be measured initially at issuance and remeasured subsequently at fair value at the end of each reporting period. The Company bifurcated and accounted for the redemption features as a derivative liability, which had a fair value of $___ on the [insert issue date of contract, Month, Day, Year (i.e. December 31, 2023)] issuance date with a corresponding entry recorded as a debt discount. The [Type of Financing Document] were assigned the remaining value of the total proceeds. The Company amortized the aggregate debt discount using the effective interest method and recorded $___ amortization of debt discount using an effective interest rate of ___% as interest expense in the statement of operations for the year ended [${data.fiscalYearEnd}]. During the year ended [${data.fiscalYearEnd}], the Company also recorded interest expense in the statement of operations of [insert issuance cost $XX,XXX] related to the [Type of Financing Document].

      As of [${data.fiscalYearEnd}], the fair value of the derivative liability was [$___]. During the year ended [${data.fiscalYearEnd}], the Company recorded [$___] for the remeasurement of the derivative liability as a component of other income (expense), net in the statement of operations.
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: `Stockholder's Equity (Deficit)`,
    body: (data) => `
      Convertible Preferred Stock

      As of [${data.fiscalYearEnd}], the Company was authorized to issue [insert Variable 1 from Carta Certificate Transaction Report] shares of [$${data.articlesOfIncorporation.parValuePerShare}] par value convertible preferred stock.

      As of [${data.fiscalYearEnd}], the Company’s convertible preferred stock consisted of the following:

      [Insert Table A from Carta Certificate Transaction Report]

      [TABLE Convertible Preferred Stock]

      The significant rights and preferences of the Company’s convertible preferred stock are as follows:

      Dividends

      [Use extractions from https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=181359587&range=B22]
      "The Company shall not declare, pay or set aside any dividends on shares of the Company unless the holders of outstanding convertible preferred stock first receive, or simultaneously receive, a dividend in an amount equal to (i) in the case of a dividend on common stock or any class or series that is convertible into common stock, a dividend per share of the convertible preferred stock equal to the product of (A) the dividend payable on each share of such class as if all shares of such class had been converted into common stock and (B) the number of shares of common stock issuable upon conversion of a share of such convertible preferred stock or (ii) in the case of a dividend on any class or series that is not convertible into common stock, at a rate per share of the convertible preferred stock determined by (A) dividing the amount of the dividend payable on each share of such class of capital stock by the original issuance price of such class of capital stock and (B) multiplying such fraction by an amount equal to the applicable original issue price of [number] and [number] per share of Series Seed and Series A convertible preferred stock, respectively. If the Company declares, pays, or sets aside a dividend on shares of more than one class of capital stock, the dividend payable to the holders convertible preferred stock shall be calculated based upon the dividend on the class capital stock that would result in the highest dividend for such series of convertible preferred stock.

      As of December 31, 2022, no dividends have been declared. "


      Liquidation
      "In the event of any voluntary or involuntary liquidation, dissolution, or winding-up of the Company or a Deemed Liquidation Event (as defined below), the holders of each series of convertible preferred stock shall be entitled to receive an amount per share equal to the greater of (i) one times original issue price plus any declared but unpaid dividends, or (ii) such amount per share as would have been payable had all shares of such series of convertible preferred stock been converted into common stock. Following the satisfaction of the convertible preferred stock liquidation preference, all holders of shares of common stock would participate in any remaining distribution on a pro rata basis based on the number of shares held.

      As of December 31, 2022, each of the following events was considered a “Deemed Liquidation Event” unless the holders of a majority of the outstanding shares of convertible preferred stock elect by written notice sent to the Company at least 10 days prior to the effective date of any such event:

      (a)	a merger or consolidation in which (i) the Company is a constituent party or (ii) a subsidiary of the Company is a constituent party and the Company issues shares of its capital stock pursuant to such merger or consolidation, except any such merger or consolidation involving the Company or a subsidiary in which the shares of capital stock of the Company outstanding immediately prior to such merger or consolidation continue to represent, or are converted into or exchanged for shares of capital stock that represent, immediately following such merger or consolidation, at least a majority, by voting power, of the capital stock of (1) the surviving or resulting corporation; or (2) if the surviving or resulting corporation is a wholly owned subsidiary of another corporation immediately following such merger or consolidation, the parent corporation of such surviving or resulting corporation; or

      (b)	(1) the sale, lease, transfer, exclusive license or other disposition, in a single transaction or series of related transactions, by the Company or any subsidiary of the Company of all or substantially all the assets of the Company and its subsidiaries taken as a whole, or (2) the sale or disposition (whether by merger, consolidation or otherwise, and whether in a single transaction or a series of related transactions) of one or more subsidiaries of the Company if substantially all of the assets of the Company and its subsidiaries taken as a whole are held by such subsidiary or subsidiaries, except where such sale, lease, transfer, exclusive license or other disposition is to a wholly owned subsidiary of the Company."

      Conversion
      Each share of convertible preferred stock is convertible into common stock at the option of the holder, at any time after the date of issuance, at the then effective conversion rate by dividing the original issue price by the conversion price. The conversion price per share shall be the original issue price subject to adjustment for stock splits and certain dividends and distributions to holders of common stock.

      All outstanding shares of convertible preferred stock shall automatically be converted into shares of common stock at the then effective conversion rate (discussed above) upon  (i) upon the vote or written consent of the holders of at least a majority of the outstanding shares of convertible preferred stock, or (ii) the closing of the sale of shares of common stock to the public in a firm-commitment underwritten public offering including, but not limited to an initial public offering or special purpose acquisition company listed and related private investment in public equity transaction.

      The following table summarizes the number of shares of common stock into which each share of convertible preferred stock can be converted as of [${data.fiscalYearEnd}]:

      [Insert Table B from Carta Certificate Transaction Report]


      Series Seed
      Series A


      Voting
      The holder of each share of convertible preferred stock is entitled to one vote for each share of common stock into which it would convert. As long as [number] shares of convertible preferred stock are outstanding, the holders of such shares shall be entitled to elect one director. The holders of shares of common stock shall be entitled to elect two directors. The holders of shares of convertible preferred stock and common stock, voting together as a single class and on an as converted to Common Stock basis, shall be entitled to elect two directors.

      Redemption
      The convertible preferred stock is not redeemable at the option of the holders.

      Common Stock
      "As of [${data.fiscalYearEnd}], the Company was authorized to issue [insert number from carta export] shares of [$${data.articlesOfIncorporation.parValuePerShare}] par value common stock.

      Common stockholders are entitled to dividends as and when declared, subject to the rights of holders of all classes of stock outstanding having priority rights as to dividends. There have been no dividends declared to date. The holder of each share of common stock is entitled to one vote.

      The Company had common shares reserved for future issuance upon the exercise or conversion of the following:"

      [Insert Table C from Carta Certificate Transaction Report]
      As of [Fiscal End Month & Day, December 31]
      Convertible preferred stock
      Common stock options outstanding
      Common stock options available for future grant
      Total
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Equity Incentive Plan',
    body: (data) => `
      [TABLE] https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=485990093&range=A2

      On [insert adoption date from ESOP document "January 15, 20XX"], the Company adopted the [insert title from ESOP document] (“Equity Incentive Plan”) to permit the grant of share-based awards, such as stock grants and incentive and non-statutory stock options to employees, directors and consultants. As of [${data.fiscalYearEnd}], a total of [insert stock subject to this plan] shares of the Company’s common stock were reserved for issuance under the Equity Incentive Plan, of which [insert number from Carta] were available for grant.

      Restricted Stock Awards
      "Restricted stock awards (“RSAs”) granted to date total [insert Variable 6 from Certificate Transaction Report] shares and were granted to the Company’s founders in [insert Variable 7 from SBC Report Template], and 25% of the shares vested immediately upon the grant date with the remaining shares subject ot a four-year vesting period.

      The Company had the following activity for RSAs for the year ended [${data.fiscalYearEnd}]:"

      Unvested as of [insert fiscal year end, Month, Day, Year (i.e. January 1, 2023)]
          Granted
          Vested
          Forfeited
      Unvested as of [${data.fiscalYearEnd}]

      For the year ended [${data.fiscalYearEnd}], the total fair value of RSAs that vested was [insert Variable 2 from SBC Report Template].

      As of [insert Variable 5 from SBC Report Template], there was [insert Variable 3 from SBC Report Template] of unrecognized costs related to unvested granted RSAs. That cost is expected to be recognized over a weighted average period of [insert Variable 4 from SBC Report Template] years.


      Stock Options
      A summary of stock option activity for the year ended [${data.fiscalYearEnd}] is as follows:

      Outstanding as of [insert fiscal year end, Month, Day, Year (i.e. January 1, 2023)]
          Granted
          Exercised
          Forfeited or expired
      Outstanding as of [${data.fiscalYearEnd}]
      Exercisable as of
              [${data.fiscalYearEnd}]
      Vested and expected to vest as of
              [${data.fiscalYearEnd}]

      For the year ended [${data.fiscalYearEnd}], the weighted average grant date fair value of stock options granted was [calculate from carta export].

      For the year ended [${data.fiscalYearEnd}], the aggregate intrinsic value of options exercised was [calculate from carta export].

      For the year ended [${data.fiscalYearEnd}], the total fair value of shares vested was [calculate from carta export].

      As of [${data.fiscalYearEnd}], there was [calculate from carta export] of total unrecognized compensation cost related to unvested stock options. That cost is expected to be recognized over a weighted average period of [calculate from carta export] years.

      To measure the fair value of stock options granted, the Company utilizes the Black-Scholes options pricing model. Expense is recognized over the required service period, which is generally the four-year vesting period of the options.

      The Company used valuation assumptions to estimate the fair value of share-based awards granted using weighted-average assumptions as follows for the year ended [${data.fiscalYearEnd}]:

      [Insert Table D from SBC Report Template Report]
      Year ended
      Risk-free interest rate
      Expected volatility
      Expected term (in years)
      Expected dividend yield

      Risk-Free Interest Rate
      "Risk-free interest rate represents the implied yield in effect at the time of option grant based on U.S. Treasury zero-coupon issues with remaining terms equivalent to the expected term of the option grants.
      "

      Expected Volatility
      As the Company does not have historical volatility data for its common stock, an approximation was calculated based on the historical volatility of publicly traded comparable companies.

      Expected Term
      The contractual life of options is 10 years. The Company utilized the simplified method in accordance with Securities and Exchange Commission Staff Accounting Bulletin 107 for calculating the expected term for stock options as we do not have sufficient historical data to calculate based on actual exercise and forfeiture activity.

      Expected Dividend Yield
      The Company has no history of granting dividends and there currently are no anticipated dividend declarations in the foreseeable future. As such, the Company uses an expected dividend yield of zero in the Black-Scholes option-pricing model.

      Common Stock Price
      Share-based awards are granted at fair value as determined by the board of directors at the date of grant based on information available at that time, including valuation analyses performed by an independent valuation expert.
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Income Taxes',
    body: (data) => `
      [if accumulated deficit <$0]
      The Company has incurred net operating losses since inception for both federal and state purposes and, as a result, has paid no federal and only minimal state income taxes.

      [if accumulated deficit $0>]
      The Company has incurred net operating gains for both federal and state purposes and, as a result, has paid [insert manual number from tax provisions] in federal income tax and [insert manual number from tax provisions] state income taxes.
      [End if]

      For the year ended [${data.fiscalYearEnd}], the provision for income tax expense was [insert manual number from tax provision].

      The tax effects of temporary differences and carry forwards that give rise to significant portions of the Company’s deferred tax assets are as follows (in thousands):

      [TABLE https://docs.google.com/spreadsheets/d/1JHaqpnQTd_t8ZUVzKm-M4kwUd31uNYbXgiTKtOs96ww/edit#gid=1355186227&range=A15]

      In assessing the realizability of deferred tax assets, management considers whether it is more likely than not that some portion or all of the deferred tax assets will not be realized. As a result of a history of taxable losses and uncertainties as to future profitability, the Company has recorded a full valuation allowance against its deferred tax assets.

      As of  [${data.fiscalYearEnd}], the Company had federal net operating loss carryovers of [insert manual number from income tax provision] and state net operating loss carryovers of approximately [insert manual number from income tax provision]. The federal and state net operating losses will begin to expire in [insert manual number from income tax provision] and [insert manual number from income tax provision], respectively.

      As of [${data.fiscalYearEnd}], the Company had federal credit carryovers of [insert manual number from income tax provision] and state credit carryovers of approximately [insert manual number from income tax provision]. The federal credits will begin to expire in [insert manual number from income tax provision], while the state credits will carryforward indefinitely.

      Utilization of the domestic net operating loss and tax credit carry forwards may be subject to a substantial annual limitation due to ownership change limitations that may have occurred or that could occur in the future, as required by the Internal Revenue Code Section 382, as well as similar state provisions. In general, an “ownership change,” as defined by the code, results from a transaction or series of transactions over a three-year period resulting in an ownership change of more than 50 percentage points of the outstanding stock of a company by certain stockholders or public groups. Any limitation may result in expiration of all or a portion of the net operating loss or tax credit carry forwards before utilization.

      The Company’s income tax returns for all years remain open to examination by federal and state taxing authorities due to the carryforward of tax attributes.
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Commitments and Contingencies',
    body: (data) => {
      if (data.outstandingLegalMatters.hasLegalMatters) {
        return `Legal Matters
          From time to time, the Company may become involved in various litigation and administrative proceedings relating to claims arising from its operations in the normal course of business. Currently management [${data.outstandingLegalMatters.legalMatters}]`;
      } else {
        return `Legal Matters
          From time to time, the Company may become involved in various litigation and administrative proceedings relating to claims arising from its operations in the normal course of business. Management is not currently aware of any matters that may have a material adverse impact on the Company’s business, financial position, results of operations or cash flows.`;
      }
    },
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Related Party Transactions',
    body: (data) => {
      if (data.relatedPartyTransactions.hasRelatedPartyTransactions) {
        return `The company [${data.relatedPartyTransactions.relatedPartyTransactions}].`;
      } else {
        return `The company has no related party transactions, druing the year ending [${data.fiscalYearEnd}]`;
      }
    },
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Employee Benefit Plan',
    isShowing: (data) => data.employee401k.has401K,
    body: (data) => `
      The Company maintains a 401(k) plan that covers substantially all of its employees.

      ${
        data.employee401k.doesMatch
          ? `The Company matches employee contributions up to [${data.employee401k.pctMatch}%]. For the year ended [${data.fiscalYearEnd}], the Company incurred total expense of [401k number from trial balance] for matching contributions.`
          : ''
      }
    `,
    pageBreakBefore: true,
  }),
  generateSection({
    header: 'Subsequent Events',
    body: (data) => {
      if (data.materialChangesPostAudit.hasPostAuditChanges) {
        return `The Company has completed an evaluation of all subsequent events through [published date of financial statements. Month, Day, Year (i.e. December 31, 2022)], the date on which the consolidated financial statements were issued. During which time, the company has [insert users's reponse from questionarie].`;
      } else {
        return `The Company has completed an evaluation of all subsequent events through [published date of financial statements. Month, Day, Year (i.e. December 31, 2022)], the date on which the consolidated financial statements were issued, during which time nothing has occurred outside the normal course of business operations that would require disclosure other than the events disclosed below.`;
      }
    },
    pageBreakBefore: true,
  }),
];
