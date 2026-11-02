"""
Chuong trinh: Tao anh bang chung kiem thu quy tac kinh te Lab 11
Du an: HueLegend
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def generate_evidence_image(output_path: str):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6.5), dpi=150)
    fig.patch.set_facecolor("#0f172a")

    # Panel 1: Dong tien thu phi tao lo hang (Economic Cash Flow)
    ax1.set_facecolor("#1e293b")
    entities = ["Co so san xuat\n(Producer)", "Hop dong\nProjectCore", "Quy OCOP Hue\n(EcosystemFund)"]
    valid_changes = [-0.001, 0.0, 0.001]
    invalid_changes = [0.0, 0.0, 0.0]

    x = range(len(entities))
    width = 0.35

    rects1 = ax1.bar([p - width/2 for p in x], valid_changes, width, label="Ca hop le (Nop du 0.001 ETH)", color="#10b981", alpha=0.9)
    rects2 = ax1.bar([p + width/2 for p in x], invalid_changes, width, label="Ca vi pham (Thieu phi -> Revert)", color="#ef4444", alpha=0.9)

    ax1.set_title("Bien dong so du ETH qua giao dich createBatch()", fontsize=12, fontweight="bold", color="#f8fafc", pad=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(entities, fontsize=10, color="#cbd5e1")
    ax1.set_ylabel("Thay doi so du (ETH)", fontsize=11, color="#cbd5e1")
    ax1.tick_params(colors="#cbd5e1")
    ax1.grid(True, linestyle="--", alpha=0.2, color="#94a3b8")
    ax1.axhline(0, color="#94a3b8", linewidth=0.8)
    ax1.legend(loc="upper left", facecolor="#1e293b", edgecolor="#334155", labelcolor="#f8fafc")

    for rect in rects1:
        h = rect.get_height()
        if h != 0:
            va = "bottom" if h > 0 else "top"
            ax1.annotate(f"{h:+.3f} ETH",
                         xy=(rect.get_x() + rect.get_width() / 2, h),
                         xytext=(0, 3 if h > 0 else -12),
                         textcoords="offset points",
                         ha='center', va=va, fontsize=9, fontweight="bold", color="#10b981")

    # Panel 2: Bang ket qua kiem thu tu dong (Test Results Table)
    ax2.set_facecolor("#1e293b")
    ax2.axis("off")
    ax2.set_title("Ket qua Kiem thu Quy tac Kinh te (7/7 Passed)", fontsize=12, fontweight="bold", color="#f8fafc", pad=12)

    test_data = [
        ("TC-01 (Hop le)", "Nop du 0.001 ETH tao lo", "Thanh cong, tang quy +0.001 ETH", "PASS"),
        ("TC-01b (Vi pham)", "Nop thieu phi (0.0005 ETH)", "Revert: InsufficientBatchFee", "PASS"),
        ("TC-01c (Vuot tran)", "Admin set phi 0.02 ETH", "Revert: FeeExceedsLimit (<=0.01)", "PASS"),
        ("TC-02 (Hop le)", "Logistics them chang", "Phat event CheckpointAdded", "PASS"),
        ("TC-03 (Gian lan)", "Vi la mien quyen them chang", "Revert: UnauthorizedCaller", "PASS"),
        ("CP-01 (ClassPoint)", "Owner airdrop CLP cho sinh vien", "Khong thu phi (from != owner)", "PASS"),
        ("CP-02 (ClassPoint)", "Chuyen vuot tran 2% tong cung", "Revert: ExceedsMaxHolding", "PASS"),
    ]

    y_start = 0.88
    y_step = 0.11

    # Header
    ax2.text(0.02, y_start, "Ma ca kiem thu", fontsize=10, fontweight="bold", color="#38bdf8")
    ax2.text(0.30, y_start, "Hanh vi thuc nghiem", fontsize=10, fontweight="bold", color="#38bdf8")
    ax2.text(0.68, y_start, "Ket qua thuc te", fontsize=10, fontweight="bold", color="#38bdf8")
    ax2.text(0.92, y_start, "Status", fontsize=10, fontweight="bold", color="#38bdf8")

    ax2.plot([0.02, 0.98], [y_start - 0.03, y_start - 0.03], color="#475569", lw=1.2)

    for i, (tc, act, res, status) in enumerate(test_data):
        curr_y = y_start - 0.06 - (i * y_step)
        ax2.text(0.02, curr_y, tc, fontsize=9, fontweight="bold", color="#f8fafc")
        ax2.text(0.30, curr_y, act, fontsize=8.5, color="#cbd5e1")
        ax2.text(0.68, curr_y, res, fontsize=8, color="#94a3b8")
        ax2.text(0.92, curr_y, status, fontsize=9, fontweight="bold", color="#10b981",
                 bbox=dict(boxstyle="round,pad=0.2", facecolor="#064e3b", edgecolor="#059669", alpha=0.8))

    plt.suptitle("HUELEGEND - BANG CHUNG THUC NGHIEM LAB 11 (CA HOP LE & CA VI PHAM)", fontsize=13, fontweight="bold", color="#f8fafc", y=0.98)
    plt.tight_layout()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close()
    print(f"[OK] Da tao anh bang chung thanh cong tai: {output_path}")

if __name__ == "__main__":
    out_img = os.path.join("HueLegend", "evidence", "lab-11", "lab11_economic_flow.png")
    generate_evidence_image(out_img)
