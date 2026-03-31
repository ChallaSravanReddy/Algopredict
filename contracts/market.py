# AlgoPredict Smart Contract (PyTeal)
# Note: This is a conceptual representation of the Algorand Smart Contract.
# In a real environment, this would be compiled to TEAL and deployed.

from pyteal import *

def approval_program():
    # Global State Keys
    total_yes_pool = Bytes("yes_pool")
    total_no_pool = Bytes("no_pool")
    market_status = Bytes("status") # 0: Open, 1: Closed, 2: Resolved
    winning_outcome = Bytes("winner") # 1: Yes, 2: No
    oracle_address = Bytes("oracle")
    end_timestamp = Bytes("end_time")

    # Local State Keys (User Positions)
    user_yes_shares = Bytes("u_yes")
    user_no_shares = Bytes("u_no")

    # Handle Initialization
    handle_init = Seq([
        App.globalPut(total_yes_pool, Int(0)),
        App.globalPut(total_no_pool, Int(0)),
        App.globalPut(market_status, Int(0)),
        App.globalPut(oracle_address, Txn.sender()), # Deployer is initial oracle
        App.globalPut(end_timestamp, Btoi(Txn.application_args[0])),
        Return(Int(1))
    ])

    # Betting Logic (Buy YES)
    buy_yes = Seq([
        Assert(App.globalGet(market_status) == Int(0)),
        Assert(Global.latest_timestamp() < App.globalGet(end_timestamp)),
        # Payment must be the second transaction in the group
        Assert(Gtxn[1].type_enum() == TxnType.Payment),
        Assert(Gtxn[1].receiver() == Global.current_application_address()),
        
        # Update Global State
        App.globalPut(total_yes_pool, App.globalGet(total_yes_pool) + Gtxn[1].amount()),
        
        # Update Local State
        App.localPut(Int(0), user_yes_shares, App.localGet(Int(0), user_yes_shares) + Gtxn[1].amount()),
        Return(Int(1))
    ])

    # Oracle Resolution
    resolve_market = Seq([
        Assert(Txn.sender() == App.globalGet(oracle_address)),
        App.globalPut(winning_outcome, Btoi(Txn.application_args[1])),
        App.globalPut(market_status, Int(2)),
        Return(Int(1))
    ])

    # Claim Rewards
    claim_rewards = Seq([
        Assert(App.globalGet(market_status) == Int(2)),
        # Logic to calculate payout based on pool ratio
        # Payout = (UserShares / TotalWinningShares) * TotalPool
        # ... (Math implementation)
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), handle_init],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.application_args[0] == Bytes("buy_yes"), buy_yes],
        [Txn.application_args[0] == Bytes("resolve"), resolve_market],
        [Txn.application_args[0] == Bytes("claim"), claim_rewards]
    )

    return program

if __name__ == "__main__":
    print(compileTeal(approval_program(), Mode.Application, version=5))
