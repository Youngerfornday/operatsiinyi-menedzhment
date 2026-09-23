import { pickOne, type RandomSource } from '../shared/random';
import type { FacilityProfile } from './types';

/**
 * Пул дільниць варіанта: переробна промисловість або сфера послуг із серійним чи масовим
 * характером операцій (companyCriteria course.yaml). Структура фіксована — випадковим є лише
 * вибір і числові дані навколо неї, щоб 100 варіантів завжди лишались коректними.
 */
const ENTERPRISE_TYPE_LABELS: Readonly<Record<FacilityProfile['enterpriseType'], string>> = {
  processing: 'переробна промисловість',
  service: 'сфера послуг',
};

const FACILITY_POOL: ReadonlyArray<Omit<FacilityProfile, 'enterpriseTypeLabel'>> = [
  { id: 'garment-cutting', section: 'Дільниця розкрою тканини швейного цеху', enterpriseType: 'processing', product: 'чоловічі сорочки', unit: 'шт.' },
  { id: 'confectionery-packing', section: 'Дільниця пакування кондитерських виробів', enterpriseType: 'processing', product: 'коробки цукерок', unit: 'уп.' },
  { id: 'furniture-assembly', section: 'Дільниця складання меблевих щитів', enterpriseType: 'processing', product: 'меблеві щити', unit: 'шт.' },
  { id: 'meat-processing', section: 'Дільниця обробки м’ясної сировини', enterpriseType: 'processing', product: 'ковбасні вироби', unit: 'кг' },
  { id: 'appliance-repair', section: 'Дільниця ремонту побутової техніки', enterpriseType: 'service', product: 'відремонтовані пральні машини', unit: 'шт.' },
  { id: 'car-detailing', section: 'Дільниця миття та передпродажної підготовки автомобілів', enterpriseType: 'service', product: 'підготовлені автомобілі', unit: 'шт.' },
  { id: 'print-shop', section: 'Дільниця виготовлення поліграфічної продукції', enterpriseType: 'processing', product: 'рекламні буклети', unit: 'уп.' },
  { id: 'heat-treatment', section: 'Дільниця термообробки металовиробів', enterpriseType: 'processing', product: 'оброблені деталі', unit: 'шт.' },
  { id: 'beverage-bottling', section: 'Дільниця розливу безалкогольних напоїв', enterpriseType: 'processing', product: 'пляшки напою', unit: 'шт.' },
  { id: 'shoe-stitching', section: 'Дільниця пошиття взуття', enterpriseType: 'processing', product: 'пари взуття', unit: 'пар' },
];

export function pickFacility(random: RandomSource): FacilityProfile {
  const base = pickOne(FACILITY_POOL, random);
  return { ...base, enterpriseTypeLabel: ENTERPRISE_TYPE_LABELS[base.enterpriseType] };
}
