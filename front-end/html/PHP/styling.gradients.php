<?php
function createCSSLinearSequence($arr, $val){
		$outp = "";
		switch ($val){
			case 0:foreach ($arr as $x){$outp.=$x[0]." ".$x[1].", ";}; break;
			case 1:foreach ($arr as $x){$outp.="color-stop(".$x[1].",".$x[0]."), ";}; break;
			case 2: $outp = "startColorstr='".$arr[0][0]."', endColorstr='".end($arr)[0]."', "; break;
			default: "  "; break;
		}
		return substr($outp, 0, -2);
	}
	function CSSLinearGradientFill($name, $arr, $imp){
		$starts = array (0 => "background-image: ", 1 => "filter: progid:DXImageTransform.Microsoft.");
		$ext = array(0 => "-moz-linear-", 1 => "-webkit-", 2 => "-webkit-linear-", 3 => "-o-linear-", 4 => "-ms-linear-", 5 => "linear-", 6 =>"");
		$preSpec = array (0 => "top", 1 => "linear, left top, left bottom", 2 => "to bottom", 3 => "");
		$postSpec = array (0 => "", 1 => ",GradientType=0");
		if ($imp == true) {$important ="!important";} else {$important ="";}
		$result = [];
		$result[] = ".".$name." {\n";
		$result[] = "\t".$starts[0].$ext[0]."gradient(".$preSpec[0].",".createCSSLinearSequence($arr, 0).$postSpec[0].")".$important.";\n";
		$result[] = "\t".$starts[0].$ext[1]."gradient(".$preSpec[1].",".createCSSLinearSequence($arr, 1).$postSpec[0].")".$important.";\n";
		$result[] = "\t".$starts[0].$ext[2]."gradient(".$preSpec[0].",".createCSSLinearSequence($arr, 0).$postSpec[0].")".$important.";\n";
		$result[] = "\t".$starts[0].$ext[3]."gradient(".$preSpec[0].",".createCSSLinearSequence($arr, 0).$postSpec[0].")".$important.";\n";
		$result[] = "\t".$starts[0].$ext[4]."gradient(".$preSpec[0].",".createCSSLinearSequence($arr, 0).$postSpec[0].")".$important.";\n";
		$result[] = "\t".$starts[0].$ext[5]."gradient(".$preSpec[2].",".createCSSLinearSequence($arr, 0).$postSpec[0].")".$important.";\n";
		$result[] = "\t".$starts[1].$ext[6]."gradient(".$preSpec[0].",".createCSSLinearSequence($arr, 2).$postSpec[1].")".$important.";\n";
		$result[] ="}\n";
		return implode($result);
	}
?>
