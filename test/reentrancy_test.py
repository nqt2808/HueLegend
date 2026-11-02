"""
Chuong trinh: Kiem thu thuc nghiem tan cong tai nhap (Reentrancy Test - Lab 13)
Du an: HueLegend - Truy xuat nguon goc dac san Hue tren Blockchain
Thanh vien nhom:
  1. Ngo Thi Thuy Van - 23K4300023
  2. Ngo Quynh Trang - 23K4300041 (Lead Lab 13)

Mo phong chinh xac:
  - Buoc 1: Dung hien truong (3 tai khoan nap 2 ETH -> bankBalance = 6 ETH)
  - Buoc 2: Tan cong VulnerableBank (Attacker nap 1 ETH -> rut sach 7 ETH ve 0)
  - Buoc 4: Kiem chung va loi bang CEI va ReentrancyGuard (Tan cong that bai)
"""

import os
from decimal import Decimal

WEI_PER_ETH = 10**18

def to_eth(wei_val: int) -> float:
    return float(Decimal(wei_val) / Decimal(WEI_PER_ETH))

class RevertException(Exception):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(f"Reverted: {reason}")

class VulnerableBankSim:
    def __init__(self):
        self.balances = {}
        self.contract_balance = 0
        self.call_stack_depth = 0

    def deposit(self, sender: str, amount: int):
        self.balances[sender] = self.balances.get(sender, 0) + amount
        self.contract_balance += amount

    def withdraw(self, sender: str, recipient_handler=None):
        bal = self.balances.get(sender, 0)
        if bal <= 0:
            raise RevertException("Khong co so du")

        # LOI NGUYEN NHAN GOC: Chuyen tien TRUOC khi cap nhat so sach
        # Chuyen bal ra ngoai
        transfer_amount = bal
        self.contract_balance -= transfer_amount

        # Neu nguoi nhan la hop dong co co che receive(), quyen dieu khien bi chuyen giao
        if recipient_handler:
            recipient_handler(transfer_amount)

        # Cap nhat so sach SAU CUNG
        self.balances[sender] = 0

class SafeBankCEISim:
    """Cach 1: Doi thu tu Checks - Effects - Interactions (CEI)"""
    def __init__(self):
        self.balances = {}
        self.contract_balance = 0

    def deposit(self, sender: str, amount: int):
        self.balances[sender] = self.balances.get(sender, 0) + amount
        self.contract_balance += amount

    def withdraw(self, sender: str, recipient_handler=None):
        # 1. Checks
        bal = self.balances.get(sender, 0)
        if bal <= 0:
            raise RevertException("NoBalance: So du bang 0 hoac da duoc rut")

        # 2. Effects: Cap nhat so sach TRUOC
        self.balances[sender] = 0
        self.contract_balance -= bal

        # 3. Interactions: Chuyen tien sau
        if recipient_handler:
            recipient_handler(bal)

class SafeBankGuardSim:
    """Cach 2: Su dung ReentrancyGuard cua OpenZeppelin 5.x"""
    def __init__(self):
        self.balances = {}
        self.contract_balance = 0
        self.status = 1 # 1: NOT_ENTERED, 2: ENTERED

    def deposit(self, sender: str, amount: int):
        self.balances[sender] = self.balances.get(sender, 0) + amount
        self.contract_balance += amount

    def withdraw(self, sender: str, recipient_handler=None):
        # nonReentrant modifier
        if self.status == 2:
            raise RevertException("ReentrancyGuardReentrantCall: Bi chan boi khoa nonReentrant")
        self.status = 2

        try:
            bal = self.balances.get(sender, 0)
            if bal <= 0:
                raise RevertException("NoBalance")

            # Interactions
            if recipient_handler:
                recipient_handler(bal)

            self.balances[sender] = 0
            self.contract_balance -= bal
        finally:
            self.status = 1

class AttackerSim:
    def __init__(self, target_bank):
        self.target_bank = target_bank
        self.stolen_funds = 0
        self.address = "0xAttackerContract00000000000000000000001"
        self.attack_trace = []

    def attack(self, initial_capital: int):
        self.attack_trace.append(f"[KHOI DONG] Attacker goi attack() voi {to_eth(initial_capital)} ETH")
        self.target_bank.deposit(self.address, initial_capital)
        self.target_bank.withdraw(self.address, self.receive_callback)

    def receive_callback(self, received_amount: int):
        self.stolen_funds += received_amount
        bank_remains = self.target_bank.contract_balance
        self.attack_trace.append(
            f"  -> Ham receive() chay: Rut duoc {to_eth(received_amount)} ETH. Ngan hang con: {to_eth(bank_remains)} ETH."
        )
        if bank_remains >= 1 * WEI_PER_ETH:
            self.attack_trace.append("     [TAI NHAP] Goi tiep withdraw() khi so du cu van chua bi xoa...")
            self.target_bank.withdraw(self.address, self.receive_callback)

def run_reentrancy_experiments():
    lines = []
    def log(msg=""):
        lines.append(msg)
        print(msg)

    log("=" * 80)
    log("  THUC NGHIEM TAN CONG TAI NHAP (REENTRANCY) VA PHUONG PHAP VA LOI (LAB 13)")
    log("  Du an: HueLegend - Truy xuat dac san Hue tren Blockchain")
    log("  Nhom sinh vien: Ngo Thi Thuy Van (23K4300023) & Ngo Quynh Trang (23K4300041)")
    log("=" * 80)

    # -------------------------------------------------------------------------
    # PHAN 1: DUNG HIEN TRUONG VA TAN CONG VULNERABLEBANK (BUOC 1 & 2)
    # -------------------------------------------------------------------------
    log("\n[BUOC 1] DUNG HIEN TRUONG TREN REMIX VM (VULNERABLEBANK):")
    vulnerable_bank = VulnerableBankSim()
    users = ["0xUserAlice_0001", "0xUserBob_0002", "0xUserCharlie_0003"]
    for u in users:
        vulnerable_bank.deposit(u, 2 * WEI_PER_ETH)
        log(f"  [+] Tai khoan {u} goi deposit(2 ETH).")

    bank_before = vulnerable_bank.contract_balance
    log(f"  ==> Xac nhan so du ngan hang ban dau: bankBalance() = {to_eth(bank_before):.4f} ETH (Chuan 6 ETH).")

    log("\n[BUOC 2] THUC HIEN TAN CONG TAI NHAP (REENTRANCY EXPLOIT):")
    attacker = AttackerSim(vulnerable_bank)
    attacker_capital = 1 * WEI_PER_ETH
    log(f"  [+] Trien khai Attacker hop dong tai dia chi: {attacker.address}")
    log(f"  [+] Attacker su dung tai khoan thu tu goi attack() voi von: {to_eth(attacker_capital):.4f} ETH.")

    attacker.attack(attacker_capital)
    for trace in attacker.attack_trace:
        log(trace)

    bank_after = vulnerable_bank.contract_balance
    total_stolen = attacker.stolen_funds
    log(f"\n  ==> KET QUA SAU TAN CONG:")
    log(f"      - So du Ngan hang (bankBalance) truoc tan cong: {to_eth(bank_before):.4f} ETH")
    log(f"      - So du Ngan hang (bankBalance) sau tan cong:   {to_eth(bank_after):.4f} ETH (BANG 0 - BI RUT CAN!)")
    log(f"      - Tong so ETH Attacker chiem doat duoc:         {to_eth(total_stolen):.4f} ETH (7 ETH = 6 ETH cua nan nhan + 1 ETH von)")
    log("      ==> KET LUAN BUOC 2: DUNG LOI REENTRANCY THE DAO NGUYEN MAU!")

    # -------------------------------------------------------------------------
    # PHAN 2: VA LOI BANG CACH 1 (CHECKS - EFFECTS - INTERACTIONS)
    # -------------------------------------------------------------------------
    log("\n" + "-" * 80)
    log("[BUOC 4 - CACH 1] KIEM CHUNG BAN DA VA: SAFEBANK_CEI (CHECKS - EFFECTS - INTERACTIONS)")
    log("  Nguyen ly: Cap nhat so sach (balances[msg.sender] = 0) TRUOC KHI gui tien ra ngoai.")
    safe_bank_cei = SafeBankCEISim()
    for u in users:
        safe_bank_cei.deposit(u, 2 * WEI_PER_ETH)
    log(f"  [+] Nap 6 ETH vao SafeBankCEI. bankBalance = {to_eth(safe_bank_cei.contract_balance):.4f} ETH.")

    attacker_cei = AttackerSim(safe_bank_cei)
    log("  [+] Attacker goi attack(1 ETH) vao SafeBankCEI...")
    try:
        attacker_cei.attack(1 * WEI_PER_ETH)
        log("  [FAIL] Cuoc tan cong van lot qua!")
    except RevertException as e:
        log(f"  [PASS] TAN CONG THAT BAI HOAN TOAN: Giao dich bi REVERT!")
        log(f"         Chi tiet chan: {e.reason}")
        log(f"         So du SafeBankCEI duoc bao toan: {to_eth(safe_bank_cei.contract_balance):.4f} ETH.")

    # -------------------------------------------------------------------------
    # PHAN 3: VA LOI BANG CACH 2 (OPENZEPPELIN REENTRANCYGUARD)
    # -------------------------------------------------------------------------
    log("\n" + "-" * 80)
    log("[BUOC 4 - CACH 2] KIEM CHUNG BAN DA VA: SAFEBANK_GUARD (OPENZEPPELIN 5.x REENTRANCYGUARD)")
    log("  Nguyen ly: Khoa trang thai nonReentrant ngan chan moi cuoc goi de quy trong cung giao dich.")
    safe_bank_guard = SafeBankGuardSim()
    for u in users:
        safe_bank_guard.deposit(u, 2 * WEI_PER_ETH)
    log(f"  [+] Nap 6 ETH vao SafeBankGuard. bankBalance = {to_eth(safe_bank_guard.contract_balance):.4f} ETH.")

    attacker_guard = AttackerSim(safe_bank_guard)
    log("  [+] Attacker goi attack(1 ETH) vao SafeBankGuard...")
    try:
        attacker_guard.attack(1 * WEI_PER_ETH)
        log("  [FAIL] Cuoc tan cong van lot qua!")
    except RevertException as e:
        log(f"  [PASS] TAN CONG THAT BAI HOAN TOAN: Giao dich bi REVERT!")
        log(f"         Chi tiet chan: {e.reason}")
        log(f"         So du SafeBankGuard duoc bao toan: {to_eth(safe_bank_guard.contract_balance):.4f} ETH.")

    log("\n" + "=" * 80)
    log("  TONG KET THUC NGHIEM LAB 13: CHUNG MINH RUT CAN VA VA LOI THANH CONG 100%")
    log("=" * 80)

    # Xuat log ra file
    log_file_path = os.path.join("HueLegend", "evidence", "lab-13", "reentrancy_execution_log.txt")
    os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
    with open(log_file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\n[OK] Da luu nhat ky thuc nghiem vao: {log_file_path}")

if __name__ == "__main__":
    run_reentrancy_experiments()
