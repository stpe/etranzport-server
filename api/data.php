<?php

// Exceptions

class DataException extends RuntimeException {

    public function __construct($message, $code = 0, Exception $previous = null) {
        parent::__construct($message, $code, $previous);

        $this->log();
    }

    private function log() {
        $msg = $this->getMessage();
        error_log($msg);
    }
}

class DataFileException extends DataException {

}

class DataFormatException extends DataException {

}

// Main class

class Data {
    private $data;

    function __construct($filename) {
        $this->load($filename);
    }

    private function load($filename) {
        $contents = file_get_contents($filename);

        if (!$contents) {
            throw new DataFileException("Can't open data file '$filename'");
        }

        $decoded = json_decode($contents, true);
        if (!$decoded) {
            throw new DataFormatException("Can't parse data file '$filename', error: " . json_last_error());
        }

        $this->data = $decoded;
    }

    public function out() {
        echo json_encode($this->data, JSON_PRETTY_PRINT);
    }

    public function getData() {
        return $this->data;
    }
}

// Specific data type implementations
