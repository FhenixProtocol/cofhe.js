"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePermitFromLocalstorage = exports.storePermitInLocalStorage = exports.getPermitFromLocalstorage = exports.removePermit = exports.generatePermit = exports.getAllPermits = exports.getAllExistingPermits = exports.getPermit = exports.parsePermit = void 0;
const utils_js_1 = require("../../../sdk/utils.js");
const types_js_1 = require("../../../sdk/types.js");
const sealing_js_1 = require("../../../sdk/sealing.js");
const PERMIT_PREFIX = "Fhenix_saved_permit_";
const parsePermit = (savedPermit) => {
    const o = JSON.parse(savedPermit);
    if (o) {
        return {
            contractAddress: o.contractAddress,
            sealingKey: new sealing_js_1.SealingKey(o.sealingKey.privateKey, o.sealingKey.publicKey),
            signature: o.signature,
            publicKey: `0x${o.sealingKey.publicKey}`,
        };
    }
    throw new Error(`Cannot parse permit`);
};
exports.parsePermit = parsePermit;
const getPermit = async (contract, provider, autoGenerate = true) => {
    (0, utils_js_1.isAddress)(contract);
    if (!provider) {
        throw new Error(`Missing provider`);
    }
    const getSigner = (0, types_js_1.determineRequestSigner)(provider);
    const signer = await getSigner(provider);
    const savedPermit = (0, exports.getPermitFromLocalstorage)(contract, await signer.getAddress());
    if (savedPermit != null)
        return savedPermit;
    return autoGenerate ? (0, exports.generatePermit)(contract, provider) : null;
};
exports.getPermit = getPermit;
const getAllExistingPermits = (account) => {
    const permits = {};
    const search = new RegExp(`${PERMIT_PREFIX}(.*?)_${account}`);
    Object.keys(window.localStorage).forEach((key) => {
        const matchArray = key.match(search);
        if (matchArray == null)
            return;
        const contract = matchArray[1];
        const permitRaw = window.localStorage.getItem(key);
        if (permitRaw == null)
            return;
        try {
            const permit = (0, exports.parsePermit)(permitRaw);
            permits[contract] = permit;
        }
        catch (err) {
            console.warn(err);
        }
    });
    return permits;
};
exports.getAllExistingPermits = getAllExistingPermits;
const getAllPermits = () => {
    const permits = new Map();
    for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.includes(PERMIT_PREFIX)) {
            const contract = key.replace(PERMIT_PREFIX, "");
            // Not sure if needed, code placeholder:
            // const noPrefixPermit = key.replace(PERMIT_PREFIX, "");
            // let contract = "";
            // if (noPrefixPermit.includes("_")) {
            //   const tmp = noPrefixPermit.split("_");
            //   contract = tmp[0];
            // } else {
            //   contract = noPrefixPermit;
            // }
            try {
                const permit = (0, exports.parsePermit)(window.localStorage.getItem(key));
                permits.set(contract, permit);
            }
            catch (err) {
                console.warn(err);
            }
        }
    }
    return permits;
};
exports.getAllPermits = getAllPermits;
const sign = async (signer, domain, types, value) => {
    if ("_signTypedData" in signer &&
        typeof signer._signTypedData == "function") {
        return await signer._signTypedData(domain, types, value);
    }
    else if ("signTypedData" in signer &&
        typeof signer.signTypedData == "function") {
        return await signer.signTypedData(domain, types, value);
    }
    throw new Error("Unsupported signer");
};
const generatePermit = async (contract, provider, customSigner) => {
    if (!provider) {
        throw new Error("Provider is undefined");
    }
    const requestMethod = (0, types_js_1.determineRequestMethod)(provider);
    let signer;
    if (!customSigner) {
        const getSigner = (0, types_js_1.determineRequestSigner)(provider);
        signer = await getSigner(provider);
    }
    else {
        signer = customSigner;
    }
    const chainId = await requestMethod(provider, "eth_chainId", []);
    const keypair = await (0, sealing_js_1.GenerateSealingKey)();
    const msgParams = {
        types: {
            // This refers to the domain the contract is hosted on.
            EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
            ],
            // Refer to primaryType.
            Permissioned: [{ name: "publicKey", type: "bytes32" }],
        },
        // This defines the message you're proposing the user to sign, is dapp-specific, and contains
        // anything you want. There are no required fields. Be as explicit as possible when building out
        // the message schema.
        // This refers to the keys of the following types object.
        primaryType: "Permissioned",
        domain: {
            // Give a user-friendly name to the specific contract you're signing for.
            name: "Fhenix Permission", // params.name
            // This identifies the latest version.
            version: "1.0", //params.version ||
            // This defines the network, in this case, Mainnet.
            chainId: chainId,
            // // Add a verifying contract to make sure you're establishing contracts with the proper entity.
            verifyingContract: contract, //params.verifyingContract,
        },
        message: {
            publicKey: `0x${keypair.publicKey}`,
        },
    };
    const msgSig = await sign(signer, msgParams.domain, { Permissioned: msgParams.types.Permissioned }, msgParams.message);
    const permit = {
        contractAddress: contract,
        sealingKey: keypair,
        signature: msgSig,
        publicKey: `0x${keypair.publicKey}`,
        //permit: msgParams,
        //msgSig
    };
    (0, exports.storePermitInLocalStorage)(permit, await signer.getAddress());
    return permit;
};
exports.generatePermit = generatePermit;
const removePermit = (contract, account) => {
    if (!account) {
        // Backward compatibility
        window.localStorage.removeItem(`${PERMIT_PREFIX}${contract}`);
    }
    else {
        window.localStorage.removeItem(`${PERMIT_PREFIX}${contract}_${account}`);
    }
};
exports.removePermit = removePermit;
const getPermitFromLocalstorage = (contract, account) => {
    let savedPermit = null;
    if (typeof window !== "undefined" && window.localStorage) {
        savedPermit = window.localStorage.getItem(`${PERMIT_PREFIX}${contract}_${account}`);
        if (!account) {
            // Backward compatibility
            savedPermit = window.localStorage.getItem(`${PERMIT_PREFIX}${contract}`);
        }
        else {
            savedPermit = window.localStorage.getItem(`${PERMIT_PREFIX}${contract}_${account}`);
        }
    }
    if (!savedPermit) {
        return undefined;
    }
    return (0, exports.parsePermit)(savedPermit);
};
exports.getPermitFromLocalstorage = getPermitFromLocalstorage;
const storePermitInLocalStorage = (permit, account) => {
    if (typeof window !== "undefined" && window.localStorage) {
        // Sealing key is a class, and will include methods in the JSON
        const serialized = {
            contractAddress: permit.contractAddress,
            sealingKey: {
                publicKey: permit.sealingKey.publicKey,
                privateKey: permit.sealingKey.privateKey,
            },
            signature: permit.signature,
        };
        window.localStorage.setItem(`${PERMIT_PREFIX}${permit.contractAddress}_${account}`, JSON.stringify(serialized));
    }
};
exports.storePermitInLocalStorage = storePermitInLocalStorage;
const removePermitFromLocalstorage = (contract, account) => {
    if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(`${PERMIT_PREFIX}${contract}_${account}`);
    }
};
exports.removePermitFromLocalstorage = removePermitFromLocalstorage;
//# sourceMappingURL=index.js.map