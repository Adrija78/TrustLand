// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TrustLend {
    enum LoanStatus {
        Pending,
        Funded,
        Repaid,
        Defaulted,
        Rejected
    }

    struct BorrowerProfile {
        uint8 trustScore;
        uint16 successfulLoans;
        uint256 totalRepaid;
        bool exists;
    }

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 interestBps;
        uint256 durationDays;
        uint256 dueDate;
        uint256 amountRepaid;
        string purpose;
        LoanStatus status;
    }

    address public owner;
    uint256 public minTrustScore = 40;
    uint256 public nextLoanId = 1;
    uint256 public nextTokenId = 1;
    uint256 public totalLiquidity;
    uint256 public totalLoaned;

    mapping(address => BorrowerProfile) public profiles;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256) public lenderBalances;
    mapping(uint256 => address) private tokenOwners;
    mapping(address => uint256) private reputationBalances;
    mapping(uint256 => string) private tokenUris;

    string public constant name = "TrustLend Reputation Passport";
    string public constant symbol = "TLREP";

    event Deposited(address indexed lender, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event ProfileUpdated(address indexed borrower, uint8 trustScore);
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 principal, string purpose);
    event LoanFunded(uint256 indexed loanId, uint256 dueDate);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, bool fullyRepaid);
    event LoanDefaulted(uint256 indexed loanId);
    event ReputationMinted(address indexed borrower, uint256 indexed tokenId, string tokenUri);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        require(msg.value > 0, "No ETH sent");
        lenderBalances[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount required");
        require(lenderBalances[msg.sender] >= amount, "Insufficient lender balance");
        require(address(this).balance >= amount, "Insufficient pool liquidity");

        lenderBalances[msg.sender] -= amount;
        totalLiquidity -= amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(msg.sender, amount);
    }

    function setMinTrustScore(uint256 score) external onlyOwner {
        require(score <= 100, "Invalid score");
        minTrustScore = score;
    }

    function upsertProfile(address borrower, uint8 trustScore) external onlyOwner {
        require(borrower != address(0), "Invalid borrower");
        require(trustScore <= 100, "Invalid score");
        BorrowerProfile storage profile = profiles[borrower];
        profile.trustScore = trustScore;
        profile.exists = true;
        emit ProfileUpdated(borrower, trustScore);
    }

    function requestLoan(
        uint256 principal,
        uint256 interestBps,
        uint256 durationDays,
        string calldata purpose
    ) external returns (uint256 loanId) {
        BorrowerProfile memory profile = profiles[msg.sender];
        require(profile.exists, "Profile missing");
        require(profile.trustScore >= minTrustScore, "Trust score too low");
        require(principal > 0, "Principal required");
        require(interestBps <= 5000, "Interest too high");
        require(durationDays > 0 && durationDays <= 365, "Invalid duration");

        loanId = nextLoanId++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            principal: principal,
            interestBps: interestBps,
            durationDays: durationDays,
            dueDate: 0,
            amountRepaid: 0,
            purpose: purpose,
            status: LoanStatus.Pending
        });
        borrowerLoans[msg.sender].push(loanId);
        emit LoanRequested(loanId, msg.sender, principal, purpose);
    }

    function fundLoan(uint256 loanId) external onlyOwner {
        Loan storage loan = loans[loanId];
        require(loan.borrower != address(0), "Loan missing");
        require(loan.status == LoanStatus.Pending, "Not pending");
        require(address(this).balance >= loan.principal, "Pool too small");

        loan.status = LoanStatus.Funded;
        loan.dueDate = block.timestamp + (loan.durationDays * 1 days);
        totalLoaned += loan.principal;

        (bool ok, ) = payable(loan.borrower).call{value: loan.principal}("");
        require(ok, "Funding failed");
        emit LoanFunded(loanId, loan.dueDate);
    }

    function repay(uint256 loanId) external payable {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "Only borrower");
        require(loan.status == LoanStatus.Funded, "Not funded");
        require(msg.value > 0, "No repayment");

        loan.amountRepaid += msg.value;
        bool fullyRepaid = loan.amountRepaid >= repaymentDue(loanId);

        if (fullyRepaid) {
            loan.status = LoanStatus.Repaid;
            BorrowerProfile storage profile = profiles[msg.sender];
            profile.successfulLoans += 1;
            profile.totalRepaid += loan.amountRepaid;
            _mintReputationIfEligible(msg.sender, profile.successfulLoans);
        }

        emit LoanRepaid(loanId, msg.sender, msg.value, fullyRepaid);
    }

    function markDefaulted(uint256 loanId) external onlyOwner {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Funded, "Not funded");
        require(block.timestamp > loan.dueDate, "Not overdue");
        loan.status = LoanStatus.Defaulted;
        emit LoanDefaulted(loanId);
    }

    function repaymentDue(uint256 loanId) public view returns (uint256) {
        Loan memory loan = loans[loanId];
        return loan.principal + ((loan.principal * loan.interestBps) / 10_000);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = tokenOwners[tokenId];
        require(tokenOwner != address(0), "Token missing");
        return tokenOwner;
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "Invalid account");
        return reputationBalances[account];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(tokenOwners[tokenId] != address(0), "Token missing");
        return tokenUris[tokenId];
    }

    function transferFrom(address, address, uint256) external pure {
        revert("Reputation is soulbound");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("Reputation is soulbound");
    }
    function getBorrowerLoans(address borrower)
    external
    view
    returns (uint256[] memory)
    {
    return borrowerLoans[borrower];
    }

    function getLoan(uint256 loanId)
    external
    view
    returns (
        address borrower,
        uint256 principal,
        uint256 interestBps,
        uint256 durationDays,
        uint256 dueDate,
        uint256 amountRepaid,
        string memory purpose,
        LoanStatus status
    )
    {
    Loan memory loan = loans[loanId];

    return (
        loan.borrower,
        loan.principal,
        loan.interestBps,
        loan.durationDays,
        loan.dueDate,
        loan.amountRepaid,
        loan.purpose,
        loan.status
    );
    }

    function _mintReputationIfEligible(address borrower, uint16 successfulLoans) private {
        string memory uri = "";
        if (successfulLoans == 1) {
            uri = "ipfs://trustlend/bronze.json";
        } else if (successfulLoans == 3) {
            uri = "ipfs://trustlend/silver.json";
        } else if (successfulLoans == 5) {
            uri = "ipfs://trustlend/gold.json";
        } else if (successfulLoans == 10) {
            uri = "ipfs://trustlend/platinum.json";
        }

        if (bytes(uri).length == 0) {
            return;
        }

        uint256 tokenId = nextTokenId++;
        tokenOwners[tokenId] = borrower;
        reputationBalances[borrower] += 1;
        tokenUris[tokenId] = uri;
        emit ReputationMinted(borrower, tokenId, uri);
    }
}
