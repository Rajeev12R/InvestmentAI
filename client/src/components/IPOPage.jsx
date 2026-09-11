import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, ShieldCheck, Scale, Flame, ArrowUpRight } from 'lucide-react';

export const ACTIVE_IPOS = [
  {
    ticker: 'MANIKA-IPO',
    name: 'Manika Plastech',
    exchange: 'BSE SME',
    gmp: 10,
    gmpPercent: 23.26,
    rating: 4,
    subscription: '1.25x',
    price: '43',
    size: '₹125.50 Cr',
    lot: '348',
    open: '10 Sep',
    close: '16 Sep',
    listing: '21 Sep',
    status: 'OPEN'
  },
  {
    ticker: 'MAHARAJA-IPO',
    name: 'Maharaja & Speedy India',
    exchange: 'BSE SME',
    gmp: 30,
    gmpPercent: 16.13,
    rating: 3,
    subscription: '0.41x',
    price: '186',
    size: '₹80.13 Cr',
    lot: '600',
    open: '10 Sep',
    close: '15 Sep',
    listing: '18 Sep',
    status: 'OPEN'
  },
  {
    ticker: 'KARAMTARA-IPO',
    name: 'Karamtara Engineering',
    exchange: 'IPO',
    gmp: 61,
    gmpPercent: 24.02,
    rating: 4,
    subscription: '65.54x',
    price: '254',
    size: '₹875.00 Cr',
    lot: '59',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'INJECTO-IPO',
    name: 'Injecto Polymers',
    exchange: 'BSE SME',
    gmp: 0,
    gmpPercent: 0,
    rating: 1,
    subscription: '0.27x',
    price: '100',
    size: '₹56.12 Cr',
    lot: '1,200',
    open: '11 Sep',
    close: '16 Sep',
    listing: '21 Sep',
    status: 'OPEN'
  },
  {
    ticker: 'NOVA-IPO',
    name: 'Nova Industrial Systems',
    exchange: 'MAINBOARD',
    gmp: 0,
    gmpPercent: 0,
    rating: 0,
    subscription: '--',
    price: '280-295',
    size: '₹640.00 Cr',
    lot: '50',
    open: '18 Sep',
    close: '22 Sep',
    listing: '26 Sep',
    status: 'UPCOMING'
  },
  {
    ticker: 'ORBIT-IPO',
    name: 'Orbit Digital Services',
    exchange: 'NSE SME',
    gmp: 0,
    gmpPercent: 0,
    rating: 0,
    subscription: '--',
    price: '115-120',
    size: '₹32.40 Cr',
    lot: '1,000',
    open: '19 Sep',
    close: '23 Sep',
    listing: '26 Sep',
    status: 'UPCOMING'
  },
  {
    ticker: 'PANCHA-IPO',
    name: 'Panchatv Bharat',
    exchange: 'BSE SME',
    gmp: 7,
    gmpPercent: 5,
    rating: 2,
    subscription: '0.04x',
    price: '140',
    size: '₹24.58 Cr',
    lot: '1,000',
    open: '10 Sep',
    close: '15 Sep',
    listing: 'Pending',
    status: 'CLOSE'
  },
  {
    ticker: 'CIRCUIT-IPO',
    name: 'Circuit Electronics',
    exchange: 'NSE SME',
    gmp: 12,
    gmpPercent: 8.57,
    rating: 2,
    subscription: '3.18x',
    price: '140',
    size: '₹48.20 Cr',
    lot: '1,000',
    open: '8 Sep',
    close: '10 Sep',
    listing: 'Pending',
    status: 'CLOSE'
  },
  {
    ticker: 'AMTECH-IPO',
    name: 'Amtech Esters',
    exchange: 'BSE SME',
    gmp: 7,
    gmpPercent: 9.33,
    rating: 2,
    subscription: '25.02x',
    price: '75',
    size: '₹17.88 Cr',
    lot: '1,600',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'RENTOMOJO-IPO',
    name: 'Rentomojo',
    exchange: 'IPO',
    gmp: 142,
    gmpPercent: 35.15,
    rating: 4,
    subscription: '72.41x',
    price: '404',
    size: '₹1255.57 Cr',
    lot: '37',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'INFRAx-IPO',
    name: 'Infrax Renewable',
    exchange: 'BSE SME',
    gmp: 0,
    gmpPercent: 0,
    rating: 1,
    subscription: '1.98x',
    price: '104',
    size: '₹40.88 Cr',
    lot: '1,200',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'VINOD-IPO',
    name: 'Vinod Texworld',
    exchange: 'NSE SME',
    gmp: 1,
    gmpPercent: 1.06,
    rating: 1,
    subscription: '1.59x',
    price: '94',
    size: '₹42.83 Cr',
    lot: '1,200',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'STEAMHOUSE-IPO',
    name: 'Steamhouse',
    exchange: 'IPO',
    gmp: 21,
    gmpPercent: 25.93,
    rating: 4,
    subscription: '31.5x',
    price: '81',
    size: '₹414.00 Cr',
    lot: '185',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'ASSET-RECON-IPO',
    name: 'Asset Reconstruction',
    exchange: 'IPO',
    gmp: 15,
    gmpPercent: 10.79,
    rating: 4,
    subscription: '19.87x',
    price: '139',
    size: '₹732.97 Cr',
    lot: '107',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'LCC-IPO',
    name: 'LCC Projects',
    exchange: 'IPO',
    gmp: 55,
    gmpPercent: 37.67,
    rating: 4,
    subscription: '48.63x',
    price: '146',
    size: '₹427.14 Cr',
    lot: '102',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  },
  {
    ticker: 'MANIPAL-IPO',
    name: 'Manipal Payment and Identity',
    exchange: 'IPO',
    gmp: 2,
    gmpPercent: 0.59,
    rating: 1,
    subscription: '1.4x',
    price: '339',
    size: '₹805.00 Cr',
    lot: '44',
    open: '9 Sep',
    close: '11 Sep',
    listing: '17 Sep',
    status: 'CLOSING TODAY'
  }
];

const IPOPage = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);

  const ipoFilters = [
    { label: 'Only Active GMP', value: 'ACTIVE_GMP', group: 'quality' },
    { label: 'SME', value: 'SME', group: 'market' },
    { label: 'Open', value: 'OPEN', badge: 'O', group: 'status' },
    { label: 'Close', value: 'CLOSE', badge: 'C', group: 'status' },
    { label: 'Closing Today', value: 'CLOSING TODAY', badge: 'CT', group: 'status' },
    { label: 'Upcoming', value: 'UPCOMING', badge: 'U', group: 'status' }
  ];

  const toggleFilter = (value) => {
    setSelectedFilters((currentFilters) => currentFilters.includes(value)
      ? currentFilters.filter((filter) => filter !== value)
      : [...currentFilters, value]);
  };

  const filteredIpos = ACTIVE_IPOS.filter((ipo) => {
    const statusFilters = selectedFilters.filter((filter) => ['OPEN', 'CLOSE', 'CLOSING TODAY', 'UPCOMING'].includes(filter));
    const marketFilters = selectedFilters.filter((filter) => ['MAINBOARD', 'SME'].includes(filter));
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(ipo.status);
    const matchesMarket = marketFilters.length === 0
      || marketFilters.some((filter) => filter === 'SME' ? ipo.exchange.includes('SME') : ipo.exchange === 'MAINBOARD');
    const matchesGmp = !selectedFilters.includes('ACTIVE_GMP') || ipo.gmp > 0;

    return matchesStatus && matchesMarket && matchesGmp;
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanCompany = company.trim().toUpperCase();
    if (cleanCompany) navigate(`/ipo/review/${cleanCompany}`);
  };

  return (
    <div className="flex-1 bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
              <FileText className="h-3.5 w-3.5" /> IPO Underwriting Desk
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 md:text-5xl">
              Analyze an IPO before it trades.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
              Review offer pricing, dilution, prospectus evidence, lock-up exposure, and use of proceeds in a dedicated IPO workflow.
            </p>
            <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Enter IPO company or ticker"
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold uppercase outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={!company.trim()}
                className="rounded-full bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start IPO Review
              </button>
            </form>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Active IPOs</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{filteredIpos.length} records</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Track open issues, grey-market premium, subscription, and listing dates.</p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-700">Active board</span>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-4">
            {ipoFilters.map((filter) => {
              const isSelected = selectedFilters.includes(filter.value);
              return (
                <label
                  key={filter.value}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50 text-slate-900 shadow-sm'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFilter(filter.value)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>{filter.label}</span>
                  {filter.badge && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] text-white ${
                      filter.value === 'OPEN' ? 'bg-emerald-600' : filter.value === 'CLOSE' ? 'bg-blue-600' : filter.value === 'CLOSING TODAY' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}>
                      {filter.badge}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-4 py-3">GMP</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Sub</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">IPO Size</th>
                  <th className="px-4 py-3">Lot</th>
                  <th className="px-4 py-3">Open</th>
                  <th className="px-4 py-3">Close</th>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-5 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIpos.map((ipo) => (
                  <tr key={ipo.ticker} className="transition-colors hover:bg-amber-50/40">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/ipo/review/${ipo.ticker}`)}
                        className="text-left font-bold text-blue-600 hover:underline"
                      >
                        {ipo.name}
                        <span className="mt-1 block text-[9px] font-bold uppercase text-slate-400">{ipo.exchange} · {ipo.status}</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-900">
                      ₹{ipo.gmp} <span className="block text-[10px] text-emerald-600">({ipo.gmpPercent.toFixed(2)}%)</span>
                    </td>
                    <td className="px-4 py-4 text-orange-500">
                      <span className="inline-flex gap-0.5" aria-label={`${ipo.rating} star rating`}>
                        {Array.from({ length: ipo.rating }, (_, index) => <Flame key={index} className="h-3.5 w-3.5 fill-orange-400" />)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{ipo.subscription}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">₹{ipo.price}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{ipo.size}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{ipo.lot}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{ipo.open}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{ipo.close}</td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{ipo.listing}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/ipo/review/${ipo.ticker}`)}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-100"
                      >
                        Review <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredIpos.length === 0 && (
              <div className="px-6 py-10 text-center text-xs font-semibold text-slate-500">
                No IPOs match the selected status.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Scale, title: 'Offer valuation', text: 'Separate the offer range from public-market price valuation.' },
            { icon: ShieldCheck, title: 'Risk gate', text: 'Track dilution, lock-up, governance, and prospectus risk.' },
            { icon: FileText, title: 'Evidence first', text: 'Keep filing status and underwriting evidence visible in the review.' }
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-5 w-5 text-amber-600" />
              <h2 className="mt-4 text-sm font-black uppercase tracking-wide text-slate-900">{title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default IPOPage;