export const ROLE = Object.freeze({
  "ADMIN": "0x2172861495e7b85edac73e3cd5fbb42dd675baadf627720e687bcfdaca025096",
  "PRODUCER": "0x0ba5d6a294d18975619aa009af5f0a28f2394d7e887fd23c22f28a99c7dd0f25",
  "LOGISTICS": "0x40eaecc116ce5d0eea6a62051370939931c44adf9a3116dae12029c664d7e90e",
  "RETAILER": "0xc2030e84afe8cfd541c4479ced4b7fbe215607847bc89259553fe65775d29de2",
  "INSPECTOR": "0xed49429b4c7fe50cdbad60132e4418036ca605907e31900afaa579e783c780ec"
});
export const ROLE_LABEL = Object.freeze({
  ADMIN: "Quản trị", PRODUCER: "Cơ sở sản xuất", LOGISTICS: "Vận chuyển",
  RETAILER: "Điểm bán", INSPECTOR: "Kiểm định"
});
export const WORKFLOW_ROLES = ["PRODUCER", "LOGISTICS", "RETAILER", "INSPECTOR"];
export function roleKey(hash) {
  return Object.keys(ROLE).find(key => ROLE[key].toLowerCase() === String(hash).toLowerCase()) || "UNKNOWN";
}
export function roleLabel(hash) { return ROLE_LABEL[roleKey(hash)] || "Vai trò khác"; }
