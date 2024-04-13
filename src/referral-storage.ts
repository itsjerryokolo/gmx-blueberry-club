import { Address, log, store } from "@graphprotocol/graph-ts";
import { SetTraderReferralCode } from "../generated/ReferralStorage/ReferralStorage";
import {
	PositionOpen,
	ReferralAccount,
	ReferralPositionID,
} from "../generated/schema";
import { BLUEBERRY_REFERRAL_CODE } from "./common/const";

export function handleSetTraderReferralCode(
	event: SetTraderReferralCode
): void {
	let referralAccount = ReferralAccount.load(event.params.account);
	if (referralAccount) {
		let IDs = referralAccount.keyIDs.load();
		for (let i = 0; i < IDs.length; i++) {
			let referralPositionID = ReferralPositionID.load(IDs[i].id);
			if (referralPositionID) {
				//remove open position
				let id = referralPositionID.keyID.toHexString();
				let position = PositionOpen.load(id);
				if (position) {
					store.remove("PositionOpen", id);
				}
			}
		}
	}

	if (event.params.code.toHexString() == BLUEBERRY_REFERRAL_CODE) {
		log.warning("Refferal Code Found---> Account: {}, Code: {}", [
			event.params.account.toHexString(),
			event.params.code.toHexString(),
		]);

		let referralAccount = new ReferralAccount(event.params.account);
		referralAccount.code = event.params.code;
		referralAccount.blockNumber = event.block.number;
		referralAccount.blockTimestamp = event.block.timestamp;
		referralAccount.transactionHash = event.transaction.hash;

		referralAccount.save();
	}
}
