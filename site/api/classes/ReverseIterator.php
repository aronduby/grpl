<?php

class ReverseIterator extends ArrayIterator {

	public function __construct(Iterator $it){

		parent::__construct(array_reverse(iterator_to_array($it)));

	}
}

?>