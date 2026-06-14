import { expect } from "chai";
import { ethers } from "hardhat";

describe("TrustLend", function () {
  async function deployTrustLend() {
    const [owner, lender, borrower] = await ethers.getSigners();
    const TrustLend = await ethers.getContractFactory("TrustLend");
    const trustLend = await TrustLend.deploy();
    await trustLend.waitForDeployment();
    return { trustLend, owner, lender, borrower };
  }

  it("funds a trust-score-gated loan and mints a bronze reputation token after repayment", async function () {
    const { trustLend, owner, lender, borrower } = await deployTrustLend();

    await trustLend.connect(lender).deposit({ value: ethers.parseEther("2") });
    await trustLend.connect(owner).upsertProfile(borrower.address, 72);
    await trustLend.connect(borrower).requestLoan(
      ethers.parseEther("1"),
      500,
      30,
      "Laptop for freelance work"
    );
    await trustLend.connect(owner).fundLoan(1);

    await trustLend.connect(borrower).repay(1, { value: ethers.parseEther("1.05") });

    const loan = await trustLend.loans(1);
    expect(loan.status).to.equal(2);
    expect(await trustLend.balanceOf(borrower.address)).to.equal(1);
    expect(await trustLend.ownerOf(1)).to.equal(borrower.address);
  });

  it("rejects borrowers below the minimum trust score", async function () {
    const { trustLend, owner, borrower } = await deployTrustLend();

    await trustLend.connect(owner).upsertProfile(borrower.address, 25);

    await expect(
      trustLend.connect(borrower).requestLoan(ethers.parseEther("1"), 500, 30, "Course fees")
    ).to.be.revertedWith("Trust score too low");
  });

  it("prevents reputation token transfers", async function () {
    const { trustLend, owner, lender, borrower } = await deployTrustLend();

    await trustLend.connect(lender).deposit({ value: ethers.parseEther("2") });
    await trustLend.connect(owner).upsertProfile(borrower.address, 80);
    await trustLend.connect(borrower).requestLoan(ethers.parseEther("1"), 500, 30, "Tuition");
    await trustLend.connect(owner).fundLoan(1);
    await trustLend.connect(borrower).repay(1, { value: ethers.parseEther("1.05") });

    await expect(
      trustLend.connect(borrower).transferFrom(borrower.address, lender.address, 1)
    ).to.be.revertedWith("Reputation is soulbound");
  });
});
