import "./styles.css";
var WebIDL2 = require("webidl2");
const text = document.querySelector("#input").value;
var tree = WebIDL2.parse(text);
var output = WebIDL2.write(tree);
document.querySelector("#outputAST").innerHTML = JSON.stringify(tree, null, 2);

import { idl2ts } from "./idl2ts";

const typescript = idl2ts(text);
document.querySelector("#outputTS").innerHTML = typescript;
