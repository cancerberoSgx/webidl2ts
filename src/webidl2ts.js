// adapted from https://github.com/markandrus/webidl2.js/blob/3d489b89f191f6ea7bda4388419c51b3d82bd169/scripts/typescript.js

import { parse } from "webidl2";

/**
 * @param {string} filepath
 * @returns {string}
 * @throws {Error}
 */
export function webidl2ts(unparsed /* : string */) /* : void */ {
  const idlDefinitions = parse(unparsed);
  const typescript = `${printIDLDefinitions(idlDefinitions)}`;
  return typescript;
}

/**
 * @param {IDLArgument} arg
 * @returns {string}
 */
function printIDLArgument(arg /* : IDLArgument */) /* : string */ {
  return `${arg.name}${arg.optional ? "?" : ""}: ${printIDLType(arg.idlType)}`;
}

/**
 * @param {Array<IDLArgument>} args
 * @returns {string}
 */
function printIDLArguments(args /* : Array<IDLArgument> */) /* : string */ {
  return args.map(printIDLArgument).join(", ");
}

/**
 * @param {IDLAttributeMember} idlAttributeMember
 * @returns {string}
 */
function printIDLAttributeMember(
  idlAttributeMember /* : IDLAttributeMember */
) /* : string */ {
  return `  ${idlAttributeMember.name}: ${printIDLType(
    idlAttributeMember.idlType
  )};`;
}

function printIDLOperationMember(idlMember) {
  let prefix =
    idlMember.special && idlMember.special.value
      ? { getter: "get", setter: "set" }[idlMember.special.value] || ""
      : "";
  return `  ${prefix} ${
    idlMember.body.name ? idlMember.body.name.value : ""
  }(${printIDLArguments(idlMember.body.arguments)}): ${printIDLType(
    idlMember.body.idlType
  )}`;
}

/**
 * @param {IDLDefinition} idlDefinition
 * @returns {?string}
 * @throws {Error}
 */
function printIDLDefinition(
  idlDefinition /* : IDLDefinition */
) /* : ?string */ {
  switch (idlDefinition.type) {
    case "dictionary":
      return printIDLDictionary(idlDefinition);
    case "enum":
      return printIDLEnum(idlDefinition);
    case "interface":
      return printIDLInterface(idlDefinition);
    case "typedef":
      // NOTE(mroberts): WebIDL cannot represent a type which is an empty Array,
      // nor can it represent "pairs" (e.g., an Array of length two); so we
      // special case these here.
      if (
        idlDefinition.name === "EmptyArray" ||
        idlDefinition.name === "PairOfIDLTypes"
      ) {
        return null;
      }
      return printIDLTypedef(idlDefinition);
    case "eof":
      return "";
    default:
      throw new Error(`I don't know how to print ${idlDefinition.type}s`);
  }
}

/**
 * @param {Array<IDLDefinition>} idlDefinitions
 * @returns {string}
 * @throws {Error}
 */
function printIDLDefinitions(
  idlDefinitions /* : Array<IDLDefinition> */
) /* : string */ {
  const typeScriptDefinitions = [];
  for (let idlDefinition of idlDefinitions) {
    const typeScriptDefinition = printIDLDefinition(idlDefinition);
    if (typeScriptDefinition) {
      typeScriptDefinitions.push(typeScriptDefinition);
    }
  }
  return typeScriptDefinitions.join("\n");
}

/**
 * @param {IDLDictionary} idlDictionary
 * @returns {string}
 */
function printIDLDictionary(
  idlDictionary /* : IDLDictionary */
) /* : string */ {
  const n = idlDictionary.members.length;
  return `export type ${idlDictionary.name} = {
${idlDictionary.members
    .map((member, i) => {
      return `  ${member.name}${member.required ? "" : "?"}: ${printIDLType(
        member.idlType
      )}${i === n - 1 ? "" : ","}`;
    })
    .join("\n")}
};
`;
}

/**
 * @param {IDLEnum} idlEnum
 * @returns {string}
 */
function printIDLEnum(idlEnum /* : IDLEnum */) /* : string */ {
  const n = idlEnum.values.length;
  return `export type ${idlEnum.name}
${idlEnum.values
    .map((value, i) => {
      return `  ${i ? "|" : "="} ${JSON.stringify(value)}${
        i === n - 1 ? ";" : ""
      }`;
    })
    .join("\n")}
`;
}

/**
 * @param {IDLInterface} idlInterface
 * @returns {string}
 * @throws {Error}
 */
function printIDLInterface(idlInterface /* : IDLInterface */) /* : string */ {
  const constructor = idlInterface.extAttrs.items.find(extAttr => {
    return extAttr.name === "Constructor";
  });
  let out = `export ${constructor ? "class" : "interface"} ${
    idlInterface.name
  }${
    idlInterface.inheritance ? ` extends ${idlInterface.inheritance}` : ""
  } {\n`;
  if (constructor) {
    out += `  constructor(${printIDLArguments(
      constructor.arguments || []
    )});\n`;
  }
  if (idlInterface.members.length) {
    out += printIDLMembers(idlInterface.members);
  }
  return out + "\n}\n";
}

/**
 * @param {IDLMember} idlMember
 * @returns {string}
 * @throws {Error}
 */
function printIDLMember(idlMember /* : IDLMember */) /* : string */ {
  switch (idlMember.type) {
    case "attribute":
      return printIDLAttributeMember(idlMember);
    case "operation":
      return printIDLOperationMember(idlMember);
    default:
      throw new Error(`I don't know how to print member type: ${idlMember}`);
  }
}

/**
 * @param {IDLMember} idlMembers
 * @returns {string}
 * @throws {Error}
 */
function printIDLMembers(idlMembers /* : Array<IDLMember> */) /* : string */ {
  return idlMembers.map(printIDLMember).join("\n");
}

/**
 * @param {IDLType} idlType
 * @returns {string}
 */
function printIDLType(idlType /* : IDLType */) /* : string */ {
  let before = "";
  let after = "";
  if (idlType.generic) {
    before = `${idlType.generic.value}<` + before;
    after += ">";
  }
  if (idlType.nullable) {
    after += "|null";
  }
  if (typeof idlType.idlType === "string") {
    let type = nativeTypes[idlType.idlType] || idlType.idlType;
    return `${before}${type}${after}`;
  } else if (Array.isArray(idlType.idlType)) {
    return `${before}${idlType.idlType.map(printIDLType).join("|")}${after}`;
  }
  return `${before}${printIDLType(idlType.idlType)}${after}`;
}

const nativeTypes = {
  // NOTE(mroberts): WebIDL cannot represent a type which is an empty Array,
  // nor can it represent "pairs" (e.g., an Array of length two); so we
  // special case these here.
  EmptyArray: "[]",
  PairOfIDLTypes: "[IDLType, IDLType]",
  sequence: "Array"
};

/**
 * @param {IDLTypedef} idlTypedef
 * @returns {string}
 * @throws {Error}
 */
function printIDLTypedef(idlTypedef /* : IDLTypedef */) /* : string */ {
  if (Array.isArray(idlTypedef.idlType.idlType)) {
    const n = idlTypedef.idlType.idlType.length;
    return `export type ${idlTypedef.name}
${idlTypedef.idlType.idlType
      .map((idlType, i) => {
        return `  ${i ? "|" : "="} ${printIDLType(idlType)}${
          i === n - 1 ? ";" : ""
        }`;
      })
      .join("\n")}
`;
  } else if (typeof idlTypedef.idlType.idlType === "string") {
    return `export type ${idlTypedef.name} = ${idlTypedef.idlType.idlType}
`;
  }
  throw new Error(`I only know how to print typedefs for unions`);
}
