// Every automatic SMS, in English and Chichewa.
// Each member gets texted in the language on her own profile.
require('dotenv').config();

const GROUP = process.env.GROUP_NAME || 'Manase Village Bank';
const CUR = process.env.CURRENCY || 'MWK';

const money = (n) =>
  `${CUR} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const day = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? String(d)
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const T = {
  savingRecorded: {
    en: (p) => `Hello ${p.name}, your saving of ${money(p.amount)} was recorded on ${day(p.date)}. Your total saved this cycle is ${money(p.total)}. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, ndalama zanu zosunga za ${money(p.amount)} zalembedwa pa ${day(p.date)}. Zonse zomwe mwasunga nyengo ino ndi ${money(p.total)}. — ${GROUP}`,
  },
  loanApplied: {
    en: (p) => `Hello ${p.name}, your loan request of ${money(p.amount)} has been received and is waiting for the committee. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, pempho lanu la ngongole ya ${money(p.amount)} lalandiridwa ndipo likudikira komiti. — ${GROUP}`,
  },
  loanApproved: {
    en: (p) => `Hello ${p.name}, your loan of ${money(p.amount)} was APPROVED. Total to repay: ${money(p.totalDue)}. Repay by ${day(p.dueDate)}. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, ngongole yanu ya ${money(p.amount)} YAVOMEREZEDWA. Zonse zoyenera kubweza: ${money(p.totalDue)}. Bwezani pofika ${day(p.dueDate)}. — ${GROUP}`,
  },
  loanRejected: {
    en: (p) => `Hello ${p.name}, your loan request of ${money(p.amount)} was not approved. ${p.note ? 'Reason: ' + p.note + '. ' : ''}Please talk to the chairlady. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, pempho lanu la ngongole ya ${money(p.amount)} silinavomerezedwe. ${p.note ? 'Chifukwa: ' + p.note + '. ' : ''}Chonde lankhulani ndi mtsogoleri. — ${GROUP}`,
  },
  repaymentRecorded: {
    en: (p) => `Hello ${p.name}, your repayment of ${money(p.amount)} was received. Balance remaining: ${money(p.remaining)}. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, kubweza kwanu kwa ${money(p.amount)} kwalandiridwa. Zotsala: ${money(p.remaining)}. — ${GROUP}`,
  },
  loanCleared: {
    en: (p) => `Hello ${p.name}, your loan is now fully repaid. Thank you. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, ngongole yanu yatha kubwezedwa yonse. Zikomo. — ${GROUP}`,
  },
  fineRecorded: {
    en: (p) => `Hello ${p.name}, a fine of ${money(p.amount)} was recorded on ${day(p.date)}. Reason: ${p.reason || 'not stated'}. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, chindapusa cha ${money(p.amount)} chalembedwa pa ${day(p.date)}. Chifukwa: ${p.reason || 'sichinatchulidwe'}. — ${GROUP}`,
  },
  welfareContribution: {
    en: (p) => `Hello ${p.name}, your welfare contribution of ${money(p.amount)} was recorded. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, thandizo lanu la ${money(p.amount)} ku thumba la chithandizo lalembedwa. — ${GROUP}`,
  },
  welfarePayoutSickness: {
    en: (p) => `Hello ${p.name}, the group has released ${money(p.amount)} from the welfare fund to help you while you are unwell. We are praying for you. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, gulu latulutsa ${money(p.amount)} kuchokera ku thumba la chithandizo kuti likuthandizeni pa nthawi ya matenda. Tikukupemphererani. — ${GROUP}`,
  },
  welfarePayoutFuneral: {
    en: (p) => `Hello ${p.name}, the group has released ${money(p.amount)} from the welfare fund for the funeral. We share in your loss. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, gulu latulutsa ${money(p.amount)} kuchokera ku thumba la chithandizo pa maliro. Tikupepesani nanu. — ${GROUP}`,
  },
  welfarePayoutOther: {
    en: (p) => `Hello ${p.name}, ${money(p.amount)} has been released to you from the welfare fund. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, ${money(p.amount)} yatulutsidwa kwa inu kuchokera ku thumba la chithandizo. — ${GROUP}`,
  },
  // Sent to the whole group when a member is sick or bereaved.
  welfareAnnounceSickness: {
    en: (p) => `Our member ${p.member} is unwell. The group has sent help from the welfare fund. Please remember her. — ${GROUP}`,
    ny: (p) => `Mnzathu ${p.member} akudwala. Gulu latumiza thandizo kuchokera ku thumba la chithandizo. Chonde mumukumbukire. — ${GROUP}`,
  },
  welfareAnnounceFuneral: {
    en: (p) => `There is a funeral in the family of our member ${p.member}. ${p.notes || ''} The group has sent help. — ${GROUP}`,
    ny: (p) => `Kwatiwa maliro m'banja la mnzathu ${p.member}. ${p.notes || ''} Gulu latumiza thandizo. — ${GROUP}`,
  },
  meetingScheduled: {
    en: (p) => `Hello ${p.name}, there is a group meeting on ${day(p.date)}${p.time ? ' at ' + p.time : ''}${p.location ? ', ' + p.location : ''}. Please come. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, pali msonkhano wa gulu pa ${day(p.date)}${p.time ? ' nthawi ya ' + p.time : ''}${p.location ? ', ku ' + p.location : ''}. Chonde mubwere. — ${GROUP}`,
  },
  shareOutReady: {
    en: (p) => `Hello ${p.name}, the share-out for this cycle is ready. Your share is ${money(p.amount)} (savings ${money(p.savings)} + profit ${money(p.profit)}). Come and collect it. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, kugawana kwa nyengo ino kwakonzeka. Gawo lanu ndi ${money(p.amount)} (zosunga ${money(p.savings)} + phindu ${money(p.profit)}). Bwerani mudzatenge. — ${GROUP}`,
  },
  memberApproved: {
    en: (p) => `Welcome ${p.name}! The group has accepted you. Your username is ${p.username} and your temporary password is ${p.password}. Please change it after you log in. — ${GROUP}`,
    ny: (p) => `Takulandirani ${p.name}! Gulu lakuvomerezani. Dzina lanu logwiritsa ntchito ndi ${p.username} ndipo achinsinsi anu a kanthawi ndi ${p.password}. Chonde asinthe mukalowa. — ${GROUP}`,
  },
  memberRejected: {
    en: (p) => `Hello ${p.name}, the group has reviewed your request to join and cannot accept it this cycle. You may apply again next cycle. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, gulu layang'ana pempho lanu lolowa nawo koma silingakuvomerezeni nyengo ino. Mutha kupemphanso nyengo ikubwera. — ${GROUP}`,
  },
  accountCreated: {
    en: (p) => `Welcome ${p.name}. Your ${GROUP} account is ready. Username: ${p.username}. Temporary password: ${p.password}. Change it after you log in. — ${GROUP}`,
    ny: (p) => `Takulandirani ${p.name}. Akaunti yanu ya ${GROUP} yakonzeka. Dzina: ${p.username}. Achinsinsi a kanthawi: ${p.password}. Asinthe mukalowa. — ${GROUP}`,
  },
  passwordResetCode: {
    en: (p) => `Your ${GROUP} reset code is ${p.code}. It expires in ${p.minutes} minutes. Do not share it with anyone.`,
    ny: (p) => `Nambala yanu yosinthira achinsinsi pa ${GROUP} ndi ${p.code}. Ithera pakatha mphindi ${p.minutes}. Musauze wina aliyense.`,
  },
  passwordChanged: {
    en: (p) => `Hello ${p.name}, your password was changed. If this was not you, tell the chairlady at once. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, achinsinsi anu asinthidwa. Ngati sanali inu, uzani mtsogoleri msanga. — ${GROUP}`,
  },
  loanDueSoon: {
    en: (p) => `Hello ${p.name}, your loan of ${money(p.outstanding)} is due on ${day(p.dueDate)}. Please repay before the cycle ends. — ${GROUP}`,
    ny: (p) => `Moni ${p.name}, ngongole yanu ya ${money(p.outstanding)} iyenera kubwezedwa pa ${day(p.dueDate)}. Chonde bwezani nyengo isanathe. — ${GROUP}`,
  },
};

/** build('savingRecorded', 'ny', { name, amount, ... }) */
function build(key, language, params = {}) {
  const tpl = T[key];
  if (!tpl) throw new Error(`Unknown SMS template: ${key}`);
  const lang = language === 'en' ? 'en' : 'ny';
  return (tpl[lang] || tpl.en)(params);
}

module.exports = { build, money, day, templates: T, GROUP, CUR };
