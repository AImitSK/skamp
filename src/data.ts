// src/data.ts
export async function getEvents() {
  return [
    { id: '1', name: 'Konferenz Q3', url: '#' },
    { id: '2', name: 'Produkt-Launch', url: '#' },
  ];
}
export async function getRecentOrders() {
  return [
    { id: '1234', date: 'Heute', customer: { name: 'Max Mustermann' }, event: { name: 'Konferenz Q3', thumbUrl: '' }, amount: { usd: '$1,200.00' }, url: '#' },
    { id: '1235', date: 'Gestern', customer: { name: 'Erika Mustermann' }, event: { name: 'Produkt-Launch', thumbUrl: '' }, amount: { usd: '$85.50' }, url: '#' },
  ];
}